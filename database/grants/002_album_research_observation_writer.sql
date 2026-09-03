ALTER TABLE fandex.album_research_observation_records OWNER TO fandex_migrator;
ALTER FUNCTION fandex.reject_album_research_observation_mutation() OWNER TO fandex_migrator;

REVOKE ALL PRIVILEGES ON TABLE fandex.album_research_observation_records FROM fandex_runtime;
GRANT SELECT, INSERT ON TABLE fandex.album_research_observation_records TO fandex_runtime;

REVOKE ALL PRIVILEGES ON FUNCTION fandex.reject_album_research_observation_mutation() FROM fandex_runtime;
