-- DRAFT: Pre-test and post-test questions for 16S rRNA Metagenomics Training
-- Status: Review with bio track before applying to a training_program row.
-- Format: assessment.questions JSONB (mcq | text). See types/database.ts.
--
-- Apply (replace <program_id> with the target training_program UUID):
--   INSERT INTO public.assessment (program_id, type, questions) VALUES (...);
--
-- Scoring: only MCQ questions are auto-scored; text answers are stored for manual review.

-- ============================================================
-- PRE-TEST (7 MCQ) — baseline knowledge before the module
-- ============================================================
-- Topics: 16S marker, microbiome goal, QC, reference DBs, ASVs, alpha diversity, QIIME 2

-- program_id: '<program_id>'
-- type: 'pre_test'
-- questions:
/*
[
  {
    "type": "mcq",
    "id": "16s_pt1",
    "question": "The 16S rRNA gene is most commonly used as a taxonomic marker for which group of organisms?",
    "options": ["Animals", "Plants and algae", "Bacteria and Archaea", "Fungi"],
    "correct": 2
  },
  {
    "type": "mcq",
    "id": "16s_pt2",
    "question": "What is the primary goal of 16S rRNA amplicon sequencing (metabarcoding)?",
    "options": [
      "To determine the complete genome sequence of a single organism",
      "To profile the taxonomic composition of microbial communities in a sample",
      "To measure which genes are actively expressed in a tissue",
      "To assemble a full transcriptome de novo"
    ],
    "correct": 1
  },
  {
    "type": "mcq",
    "id": "16s_pt3",
    "question": "In a typical 16S metagenomics pipeline, which tool is used first to inspect the quality of raw sequencing reads?",
    "options": ["BLAST", "FastQC", "SPAdes", "PICRUSt2"],
    "correct": 1
  },
  {
    "type": "mcq",
    "id": "16s_pt4",
    "question": "Which reference database is commonly used for bacterial 16S rRNA taxonomy assignment?",
    "options": ["UNITE", "BOLD", "SILVA", "PDB"],
    "correct": 2
  },
  {
    "type": "mcq",
    "id": "16s_pt5",
    "question": "In modern microbiome analysis, what does ASV stand for?",
    "options": [
      "Amplicon Sequence Variant",
      "Annotated Sequence Version",
      "Alternative Sample Volume",
      "Automated Species Verification"
    ],
    "correct": 0
  },
  {
    "type": "mcq",
    "id": "16s_pt6",
    "question": "Alpha diversity describes:",
    "options": [
      "How different microbial communities are between two or more samples",
      "The diversity of microbes within a single sample",
      "The functional pathways predicted from 16S data",
      "The quality score of individual sequencing reads"
    ],
    "correct": 1
  },
  {
    "type": "mcq",
    "id": "16s_pt7",
    "question": "Which software platform is used as the end-to-end microbiome analysis pipeline in the PGCV 16S training materials?",
    "options": ["Trinity", "QIIME 2", "BLAST", "SPAdes"],
    "correct": 1
  }
]
*/

-- ============================================================
-- POST-TEST (6 MCQ + 1 free response) — applied knowledge after the module
-- ============================================================
-- Topics: fastp, MultiQC, DADA2/ASVs, PICRUSt2, beta diversity, FASTQ, workflow summary

-- program_id: '<program_id>'
-- type: 'post_test'
-- questions:
/*
[
  {
    "type": "mcq",
    "id": "16s_pot1",
    "question": "After inspecting reads with FastQC, which tool is commonly used to trim adapters and low-quality bases before importing data into QIIME 2?",
    "options": ["MultiQC", "fastp", "SPAdes", "Trinity"],
    "correct": 1
  },
  {
    "type": "mcq",
    "id": "16s_pot2",
    "question": "What is the main purpose of MultiQC in the 16S metagenomics pipeline?",
    "options": [
      "To denoise amplicon reads into exact sequence variants",
      "To combine QC reports from multiple tools into a single summary report",
      "To assign taxonomy to ASVs against a reference database",
      "To predict metabolic pathways from 16S abundance tables"
    ],
    "correct": 1
  },
  {
    "type": "mcq",
    "id": "16s_pot3",
    "question": "In QIIME 2, denoising with DADA2 primarily produces:",
    "options": [
      "A phylogenetic tree of animal COI barcodes",
      "ASVs representing exact amplicon sequence variants",
      "A whole-genome assembly in FASTA format",
      "A list of differentially expressed genes"
    ],
    "correct": 1
  },
  {
    "type": "mcq",
    "id": "16s_pot4",
    "question": "PICRUSt2 is used to:",
    "options": [
      "Trim low-quality reads and remove adapters",
      "Predict functional potential from 16S amplicon abundance data",
      "Demultiplex indexed reads from raw sequencing output",
      "Assemble long contigs from paired-end reads"
    ],
    "correct": 1
  },
  {
    "type": "mcq",
    "id": "16s_pot5",
    "question": "Beta diversity analysis is primarily used to:",
    "options": [
      "Measure microbial richness and evenness within one sample",
      "Compare microbial community composition between samples",
      "Remove chimeric sequences from amplicon reads",
      "Generate per-base quality plots for raw FASTQ files"
    ],
    "correct": 1
  },
  {
    "type": "mcq",
    "id": "16s_pot6",
    "question": "Which file format is the standard input for quality control and trimming steps in the 16S pipeline?",
    "options": ["FASTA", "FASTQ", "BAM", "GFF"],
    "correct": 1
  },
  {
    "type": "text",
    "id": "16s_pot7",
    "question": "In your own words, describe the main steps of the 16S rRNA metagenomics workflow from raw sequencing reads through taxonomy assignment. Mention at least three tools or stages covered in this training.",
    "multiline": true
  }
]
*/

-- Example INSERT (uncomment and set program_id after review):
/*
INSERT INTO public.assessment (program_id, type, questions)
SELECT '<program_id>', 'pre_test', '[ ... pre-test JSON above ... ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.assessment
  WHERE program_id = '<program_id>' AND type = 'pre_test'
);

INSERT INTO public.assessment (program_id, type, questions)
SELECT '<program_id>', 'post_test', '[ ... post-test JSON above ... ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.assessment
  WHERE program_id = '<program_id>' AND type = 'post_test'
);
*/
