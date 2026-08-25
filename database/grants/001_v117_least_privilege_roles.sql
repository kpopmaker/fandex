REVOKE ALL ON SCHEMA fandex FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA fandex FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA fandex FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA fandex FROM PUBLIC;

ALTER SCHEMA fandex OWNER TO fandex_migrator;
ALTER TABLE fandex.schema_migrations OWNER TO fandex_migrator;
ALTER TABLE fandex.normalized_sources OWNER TO fandex_migrator;
ALTER TABLE fandex.historical_enrichment_requests OWNER TO fandex_migrator;
ALTER TABLE fandex.source_evidence_provenance OWNER TO fandex_migrator;
ALTER TABLE fandex.persistence_transactions OWNER TO fandex_migrator;
ALTER TABLE fandex.persistence_audit_events OWNER TO fandex_migrator;
ALTER TABLE fandex.ingestion_outbox OWNER TO fandex_migrator;
ALTER FUNCTION fandex.reject_audit_event_mutation() OWNER TO fandex_migrator;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA fandex FROM fandex_runtime;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA fandex FROM fandex_runtime;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA fandex FROM fandex_runtime;
REVOKE CREATE ON SCHEMA fandex FROM fandex_runtime;
GRANT USAGE ON SCHEMA fandex TO fandex_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE fandex.normalized_sources TO fandex_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE fandex.historical_enrichment_requests TO fandex_runtime;
GRANT SELECT, INSERT ON TABLE fandex.source_evidence_provenance TO fandex_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE fandex.persistence_transactions TO fandex_runtime;
GRANT SELECT, INSERT ON TABLE fandex.persistence_audit_events TO fandex_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE fandex.ingestion_outbox TO fandex_runtime;
