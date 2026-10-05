-- Store library modules by their modules.json id instead of the repo path,
-- so renaming or moving a module file in bioinfo-modules doesn't break
-- courses. The dashboard looks up the current path when a module is opened.
-- Runs after 20261005120000_module_links_github, which produced the
-- github:<path> links converted here. Unlisted github: links keep working.

UPDATE public.module AS m
SET html_content_link = map.new_link
FROM (VALUES
  ('github:Workstation-Setup/setting-up-workstation.html', 'github-module:workstation-setup'),
  ('github:Basic-Coding/basic-coding-module.html', 'github-module:basic-coding'),
  ('github:Bash-Scripting/bash-scripting-module.html', 'github-module:bash-scripting'),
  ('github:R-Short-Course/R-short-course.html', 'github-module:r-short-course'),
  ('github:Introduction-to-LaTeX/latex-overleaf-module.html', 'github-module:latex'),
  ('github:Biological-Data-Databases/biological-data-databases-module.html', 'github-module:biological-data'),
  ('github:Primer-Design/primer-design-training-module.html', 'github-module:primer-design'),
  ('github:DNA-Barcoding/dna-barcoding-module.html', 'github-module:dna-barcoding'),
  ('github:Amplicon-Assembly/amplicon-module.html', 'github-module:amplicon-assembly'),
  ('github:Phylogenetics/phylogenetic-analysis-internship-module.html', 'github-module:phylogenetics'),
  ('github:16s-Metagenomics/16s-metagenomics-module.html', 'github-module:16s-metagenomics'),
  ('github:Whole-Genome-Assembly/whole-genome-assembly-module-with-lecture.html', 'github-module:wga'),
  ('github:Whole-Genome-Assembly/whole-genome-assembly-module-hands-on.html', 'github-module:wga-hands-on'),
  ('github:Whole-Genome-Assembly/other-downstream-analyses/ggdc-guide.html', 'github-module:ggdc'),
  ('github:Whole-Genome-Assembly/other-downstream-analyses/proksee-guide.html', 'github-module:proksee'),
  ('github:Whole-Genome-Assembly/other-downstream-analyses/tygs-guide.html', 'github-module:tygs'),
  ('github:Transcriptomics/transcriptome-module.html', 'github-module:transcriptomics'),
  ('github:Functional-Annotation/revised-functional-annotation-and-pathway-enrichment-analysis.html', 'github-module:functional-annotation'),
  ('github:Troubleshooting/troubleshooting-guide.html', 'github-module:troubleshooting')
) AS map(old_link, new_link)
WHERE m.html_content_link = map.old_link;

COMMENT ON COLUMN public.module.html_content_link IS
  'Library module: github-module:<modules.json id>, e.g. github-module:dna-barcoding (older rows may hold github:<repo path>). Opened via /api/training-modules/link.';
