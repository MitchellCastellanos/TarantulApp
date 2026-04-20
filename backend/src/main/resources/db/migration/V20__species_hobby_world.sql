-- Hobbyist biogeography: New World (Americas) vs Old World (Africa/Asia/Oceania/Europe).
-- Nullable: unknown when origin text is ambiguous and GBIF distributions did not resolve.
ALTER TABLE species ADD COLUMN hobby_world VARCHAR(20) NULL;
