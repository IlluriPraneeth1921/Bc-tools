import pyodbc

SERVER = "mcs-mst-carity-v1-04065-appdb.cw1uwwm8ou9t.us-east-1.rds.amazonaws.com"

# Database 1: Interface (raw + mapped)
DB_INTERFACE = "WiDHS.Qc.Interface.Carity.ToolTesting"
# Database 2: Final Carity (note: typo in actual DB name - "ToolTestig")
DB_CARITY = "WiDHS.Qc.Carity.ToolTestig"

def get_connection(database):
    conn_str = (
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={SERVER};"
        f"DATABASE={database};"
        f"Trusted_Connection=yes;"
        f"TrustServerCertificate=yes;"
        f"Connection Timeout=30;"
    )
    return pyodbc.connect(conn_str)


def list_tables(database):
    print(f"\n{'='*80}")
    print(f"DATABASE: {database}")
    print(f"{'='*80}")
    try:
        conn = get_connection(database)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT TABLE_SCHEMA, TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_SCHEMA, TABLE_NAME
        """)
        rows = cursor.fetchall()
        current_schema = ""
        for row in rows:
            if row[0] != current_schema:
                current_schema = row[0]
                print(f"\n  Schema: [{current_schema}]")
            print(f"    - {row[1]}")
        print(f"\n  Total tables: {len(rows)}")
        conn.close()
    except Exception as e:
        print(f"  ERROR: {e}")


def list_columns(database, schemas):
    print(f"\n{'='*80}")
    print(f"COLUMNS FOR: {database}")
    print(f"{'='*80}")
    try:
        conn = get_connection(database)
        cursor = conn.cursor()
        schema_filter = ",".join(f"'{s}'" for s in schemas)
        cursor.execute(f"""
            SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE, 
                   CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, ORDINAL_POSITION
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA IN ({schema_filter})
            ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
        """)
        rows = cursor.fetchall()
        current_table = ""
        for row in rows:
            table_full = f"{row[0]}.{row[1]}"
            if table_full != current_table:
                current_table = table_full
                print(f"\n  [{current_table}]")
            max_len = f"({row[4]})" if row[4] else ""
            nullable = "NULL" if row[5] == "YES" else "NOT NULL"
            print(f"    {row[6]:3d}. {row[2]:<50} {row[3]}{max_len:<15} {nullable}")
        conn.close()
    except Exception as e:
        print(f"  ERROR: {e}")


if __name__ == "__main__":
    # First: list all tables in both databases
    list_tables(DB_INTERFACE)
    list_tables(DB_CARITY)

    # Then: get column details for key schemas
    list_columns(DB_INTERFACE, ["CustomerInterfaceModule", "InterfaceModule"])
    list_columns(DB_CARITY, ["OrganizationModule", "CustomerOrganizationModule"])
