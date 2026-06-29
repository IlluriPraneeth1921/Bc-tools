import pyodbc

SERVER = "mcs-mst-carity-v1-04065-appdb.cw1uwwm8ou9t.us-east-1.rds.amazonaws.com"
DB_CARITY = "WiDHS.Qc.Carity.ToolTestig"

def get_connection():
    conn_str = (
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={SERVER};"
        f"DATABASE={DB_CARITY};"
        f"Trusted_Connection=yes;"
        f"TrustServerCertificate=yes;"
        f"Connection Timeout=30;"
    )
    return pyodbc.connect(conn_str)

conn = get_connection()
cursor = conn.cursor()

# List Organization-related tables
print("=== OrganizationModule Tables ===")
cursor.execute("""
    SELECT TABLE_SCHEMA, TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA IN ('OrganizationModule', 'CustomerOrganizationModule')
    AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_SCHEMA, TABLE_NAME
""")
for row in cursor.fetchall():
    print(f"  [{row[0]}].[{row[1]}]")

# Get columns for Organization-related tables
print("\n\n=== Column Details ===")
cursor.execute("""
    SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE, 
           CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, ORDINAL_POSITION
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA IN ('OrganizationModule', 'CustomerOrganizationModule')
    ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
""")
current_table = ""
for row in cursor.fetchall():
    table_full = f"[{row[0]}].[{row[1]}]"
    if table_full != current_table:
        current_table = table_full
        print(f"\n{current_table}")
    max_len = f"({row[4]})" if row[4] else ""
    nullable = "NULL" if row[5] == "YES" else "NOT NULL"
    print(f"  {row[6]:3d}. {row[2]:<55} {row[3]}{max_len:<15} {nullable}")

conn.close()
