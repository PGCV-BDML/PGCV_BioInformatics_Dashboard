export interface ClientFormState {
  clientId: string;
  clientName: string;
  projectId: string;
  emailAddress: string;
  sex: string;
  mobileNumber: string;
  affiliation: string;
  affiliationAddress: string;
  designation: string;
}

export interface ClientRecord extends ClientFormState {
  id: string;
  createdAt: string;
}

export function createEmptyClientForm(): ClientFormState {
  return {
    clientId: "",
    clientName: "",
    projectId: "",
    emailAddress: "",
    sex: "",
    mobileNumber: "",
    affiliation: "",
    affiliationAddress: "",
    designation: "",
  };
}

export function createClientRecord(form: ClientFormState): ClientRecord {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...form,
  };
}
