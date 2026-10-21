import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "./chat-panel";
import {
  deleteMessage,
  getConversationPeople,
  getDefaultChannel,
  getLastReadAt,
  getMessages,
  getProgramConversation,
  markConversationRead,
  subscribeToMessages,
} from "@/lib/chat";
import { getCurrentUser } from "@/lib/supabase";
import type {
  ChatMessage,
  ChatPerson,
  Conversation,
  ProgramConversation,
} from "@/types/database";

const PROGRAM_ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

let pathname = `/dashboard/training/${PROGRAM_ID}`;
let portal = { isStaff: false, isLearnerView: true };

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("./portal-context", () => ({
  usePortal: () => portal,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {},
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/chat", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/chat")>()),
  getDefaultChannel: vi.fn(),
  getProgramConversation: vi.fn(),
  getMessages: vi.fn(),
  getLastReadAt: vi.fn(),
  getConversationPeople: vi.fn(),
  markConversationRead: vi.fn(),
  sendMessage: vi.fn(),
  deleteMessage: vi.fn(),
  subscribeToMessages: vi.fn(),
}));

const teamChannel: Conversation = {
  id: "conv-team",
  kind: "channel",
  name: "General",
  program_id: null,
  created_by: null,
  created_at: "2026-07-31T00:00:00.000Z",
  updated_at: "2026-07-31T00:00:00.000Z",
};

function programChat(
  status: ProgramConversation["program"]["status"] = "ongoing",
): ProgramConversation {
  return {
    ...teamChannel,
    id: "conv-program",
    kind: "program",
    name: null,
    program_id: PROGRAM_ID,
    program: { title: "16S Metabarcoding", status, type: "training" },
  };
}

function message(id: string, conversationId: string, senderId: string, body: string): ChatMessage {
  return {
    id,
    conversation_id: conversationId,
    sender_id: senderId,
    body,
    created_at: "2026-10-21T02:00:00.000Z",
    edited_at: null,
    deleted_at: null,
  };
}

const people: ChatPerson[] = [
  { id: "u-ada", name: "Ada Trainee", is_staff: false },
  { id: "u-ben", name: "Ben Trainee", is_staff: false },
  { id: "u-sam", name: "Sam Staff", is_staff: true },
];

const benQuestion = message("m1", "conv-program", "u-ben", "Is QIIME2 on the server?");

const messagesByConversation: Record<string, ChatMessage[]> = {
  "conv-program": [
    benQuestion,
    message("m2", "conv-program", "u-sam", "Yes, activate the qiime2 env."),
  ],
  "conv-team": [message("m3", "conv-team", "u-sam", "Staff meeting at 3")],
};

function setUp({
  userId,
  team,
  program,
}: {
  userId: string;
  team: Conversation | null;
  program: ProgramConversation | null;
}) {
  vi.mocked(getCurrentUser).mockResolvedValue({ id: userId } as never);
  vi.mocked(getDefaultChannel).mockResolvedValue(team);
  vi.mocked(getProgramConversation).mockResolvedValue(program);
  vi.mocked(getMessages).mockImplementation(
    async (id) => messagesByConversation[id] ?? [],
  );
  vi.mocked(getLastReadAt).mockResolvedValue(null);
  vi.mocked(getConversationPeople).mockResolvedValue(
    new Map(people.map((p) => [p.id, p])),
  );
  vi.mocked(markConversationRead).mockResolvedValue();
  vi.mocked(subscribeToMessages).mockReturnValue(() => {});
}

async function openChat() {
  render(<ChatPanel />);
  const launcher = await screen.findByRole("button", { name: /open chat/i });
  await userEvent.click(launcher);
  return screen.getByRole("region", { name: "Chat" });
}

describe("ChatPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathname = `/dashboard/training/${PROGRAM_ID}`;
  });

  it("gives an enrolled learner only their program chat", async () => {
    portal = { isStaff: false, isLearnerView: true };
    setUp({ userId: "u-ada", team: null, program: programChat() });

    const panel = await openChat();

    expect(within(panel).getByText("16S Metabarcoding")).toBeInTheDocument();
    expect(within(panel).queryByRole("tablist")).toBeNull();
    expect(
      within(panel).getByText(/visible to this program's participants/i),
    ).toBeInTheDocument();
    expect(await within(panel).findByText("Is QIIME2 on the server?")).toBeInTheDocument();
    expect(within(panel).getByText("Ben Trainee")).toBeInTheDocument();
    expect(getProgramConversation).toHaveBeenCalledWith(PROGRAM_ID);
  });

  it("tags staff replies in a program chat", async () => {
    portal = { isStaff: false, isLearnerView: true };
    setUp({ userId: "u-ada", team: null, program: programChat() });

    const panel = await openChat();
    await within(panel).findByText("Sam Staff");

    const staffLine = within(panel).getByText("Sam Staff").parentElement!;
    expect(within(staffLine).getByText("Staff")).toBeInTheDocument();
    const peerLine = within(panel).getByText("Ben Trainee").parentElement!;
    expect(within(peerLine).queryByText("Staff")).toBeNull();
  });

  it("lets a learner delete only their own messages", async () => {
    portal = { isStaff: false, isLearnerView: true };
    setUp({ userId: "u-ben", team: null, program: programChat() });

    const panel = await openChat();
    await within(panel).findByText("Is QIIME2 on the server?");

    expect(within(panel).getAllByRole("button", { name: "Delete message" })).toHaveLength(1);
  });

  it("shows nothing to someone with no chat on this page", async () => {
    portal = { isStaff: false, isLearnerView: true };
    setUp({ userId: "u-zed", team: null, program: null });

    const { container } = render(<ChatPanel />);

    await waitFor(() => expect(getProgramConversation).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("gives staff a program tab and a team tab on a program page", async () => {
    portal = { isStaff: true, isLearnerView: false };
    setUp({ userId: "u-sam", team: teamChannel, program: programChat() });

    const panel = await openChat();
    const tabs = await within(panel).findAllByRole("tab");

    expect(tabs.map((t) => t.textContent)).toEqual(["16S Metabarcoding", "General"]);
    const [programTab, teamTab] = tabs;
    expect(programTab).toHaveAttribute("aria-selected", "true");
    expect(await within(panel).findByText("Is QIIME2 on the server?")).toBeInTheDocument();

    await userEvent.click(teamTab!);

    expect(await within(panel).findByText("Staff meeting at 3")).toBeInTheDocument();
    expect(within(panel).queryByText("Is QIIME2 on the server?")).toBeNull();
    expect(within(panel).queryByText(/visible to this program's participants/i)).toBeNull();
  });

  it("lets staff remove a trainee's message after confirming", async () => {
    portal = { isStaff: true, isLearnerView: false };
    setUp({ userId: "u-sam", team: teamChannel, program: programChat() });
    vi.mocked(deleteMessage).mockResolvedValue({
      ...benQuestion,
      body: "Message deleted",
      deleted_at: "2026-10-21T03:00:00.000Z",
    });

    const panel = await openChat();
    await within(panel).findByText("Is QIIME2 on the server?");

    const deleteButtons = within(panel).getAllByRole("button", { name: "Delete message" });
    expect(deleteButtons).toHaveLength(2);

    await userEvent.click(deleteButtons[0]!);
    expect(deleteMessage).not.toHaveBeenCalled();
    await userEvent.click(within(panel).getByRole("button", { name: "Delete" }));

    expect(deleteMessage).toHaveBeenCalledWith("m1");
    expect(await within(panel).findByText("Message deleted")).toBeInTheDocument();
  });

  it("keeps staff on the team chat away from program pages", async () => {
    pathname = "/dashboard/services";
    portal = { isStaff: true, isLearnerView: false };
    setUp({ userId: "u-sam", team: teamChannel, program: programChat() });

    const panel = await openChat();

    expect(within(panel).queryByRole("tablist")).toBeNull();
    expect(within(panel).getByText("General")).toBeInTheDocument();
    expect(getProgramConversation).not.toHaveBeenCalled();
  });

  it("hides the team chat while staff preview the learner portal", async () => {
    portal = { isStaff: true, isLearnerView: true };
    setUp({ userId: "u-sam", team: teamChannel, program: programChat() });

    const panel = await openChat();

    expect(within(panel).queryByRole("tablist")).toBeNull();
    expect(within(panel).getByText("16S Metabarcoding")).toBeInTheDocument();
    await within(panel).findByText("Is QIIME2 on the server?");
    // Their own message only; no moderating while previewing.
    expect(within(panel).getAllByRole("button", { name: "Delete message" })).toHaveLength(1);
  });

  it("makes an archived program's chat read-only", async () => {
    portal = { isStaff: false, isLearnerView: true };
    setUp({ userId: "u-ada", team: null, program: programChat("archived") });

    const panel = await openChat();

    expect(within(panel).getByText(/archived, so its chat is read-only/i)).toBeInTheDocument();
    expect(within(panel).queryByRole("textbox", { name: "Message" })).toBeNull();
  });

  it("counts unread messages on the launcher", async () => {
    portal = { isStaff: false, isLearnerView: true };
    setUp({ userId: "u-ada", team: null, program: programChat() });

    render(<ChatPanel />);

    expect(
      await screen.findByRole("button", { name: "Open chat (2 unread)" }),
    ).toBeInTheDocument();
  });
});
