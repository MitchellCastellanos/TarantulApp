-- Safety migration for environments where V37 was not applied.
alter table if exists sex_id_cases add column if not exists stage varchar(20);
alter table if exists sex_id_cases add column if not exists image_type varchar(20);
alter table if exists sex_id_cases add column if not exists ai_male_probability double precision;
alter table if exists sex_id_cases add column if not exists ai_confidence double precision;
alter table if exists sex_id_cases add column if not exists ai_confidence_label varchar(20);
alter table if exists sex_id_cases add column if not exists ai_explanation varchar(800);
