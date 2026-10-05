-- Training modules now come from the private bioinfo-modules GitHub repo
-- (served through /api/training-modules), not copies under
-- public/assets/Training. Point existing course modules at the repo paths.

UPDATE public.module AS m
SET html_content_link = map.new_link
FROM (VALUES
  ('/assets/Training/setting-up-workstation.html',
   'github:Workstation-Setup/setting-up-workstation.html'),
  ('/assets/Training/basic-coding-module.html',
   'github:Basic-Coding/basic-coding-module.html'),
  ('/assets/Training/dna-barcoding-module.html',
   'github:DNA-Barcoding/dna-barcoding-module.html'),
  ('/assets/Training/primer-design-training-module.html',
   'github:Primer-Design/primer-design-training-module.html'),
  ('/assets/Training/transcriptome-module.html',
   'github:Transcriptomics/transcriptome-module.html'),
  ('/assets/Training/phylogenetic-analysis-internship-module.html',
   'github:Phylogenetics/phylogenetic-analysis-internship-module.html'),
  ('/assets/Training/Metagenomics/16s-metagenomics-module.html',
   'github:16s-Metagenomics/16s-metagenomics-module.html'),
  ('/assets/Training/Metagenomics/R-short-course.html',
   'github:R-Short-Course/R-short-course.html'),
  ('/assets/Training/Whole Genome Assembly/whole-genome-assembly-module-with-lecture.html',
   'github:Whole-Genome-Assembly/whole-genome-assembly-module-with-lecture.html'),
  ('/assets/Training/Whole Genome Assembly/Other Downstream Analyses/tygs-guide.html',
   'github:Whole-Genome-Assembly/other-downstream-analyses/tygs-guide.html'),
  ('/assets/Training/Whole Genome Assembly/Other Downstream Analyses/proksee-guide.html',
   'github:Whole-Genome-Assembly/other-downstream-analyses/proksee-guide.html'),
  ('/assets/Training/Whole Genome Assembly/Other Downstream Analyses/ggdc-guide.html',
   'github:Whole-Genome-Assembly/other-downstream-analyses/ggdc-guide.html')
) AS map(old_link, new_link)
WHERE m.html_content_link = map.old_link;

COMMENT ON COLUMN public.module.html_content_link IS
  'Library module: github:<path in bioinfo-modules>, e.g. github:DNA-Barcoding/dna-barcoding-module.html. Opened via /api/training-modules/link.';
