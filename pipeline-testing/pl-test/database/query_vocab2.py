import pyodbc

SERVER = "mcs-mst-carity-v1-04065-appdb.cw1uwwm8ou9t.us-east-1.rds.amazonaws.com"
DATABASE = "WiDHS.Qc.Interface.Carity.ToolTesting"

conn_str = (
    f"DRIVER={{ODBC Driver 18 for SQL Server}};"
    f"SERVER={SERVER};"
    f"DATABASE={DATABASE};"
    f"Trusted_Connection=yes;"
    f"TrustServerCertificate=yes;"
    f"Connection Timeout=30;"
)
conn = pyodbc.connect(conn_str)
cursor = conn.cursor()

# What system names exist?
print("=== Distinct CustomerSystemName values ===")
cursor.execute("SELECT DISTINCT CustomerSystemName FROM [InterfaceModule].[VocabularyLookup] ORDER BY CustomerSystemName")
for row in cursor.fetchall():
    print(f"  {row[0]}")

# What table/column combos exist?
print("\n=== All VocabularyLookup entries ===")
cursor.execute("""
    SELECT CustomerSystemName, CustomerTableName, CustomerColumnName, VocabularyLookupKey
    FROM [InterfaceModule].[VocabularyLookup]
    ORDER BY CustomerSystemName, CustomerTableName, CustomerColumnName
""")
for row in cursor.fetchall():
    print(f"  {row[0]}.{row[1]}.{row[2]} (Key: {row[3]})")

# How many display name records total?
cursor.execute("SELECT COUNT(*) FROM [InterfaceModule].[VocabularyLookupDisplayNames]")
count = cursor.fetchone()[0]
print(f"\nTotal VocabularyLookupDisplayNames records: {count}")

# Sample some display names
print("\n=== Sample VocabularyLookupDisplayNames (first 20) ===")
cursor.execute("""
    SELECT TOP 20 vld.CustomerValue, vld.DisplayName, vld.Identifier, vld.CodeSystemIdentifier,
           vl.CustomerSystemName, vl.CustomerTableName, vl.CustomerColumnName
    FROM [InterfaceModule].[VocabularyLookupDisplayNames] vld
    JOIN [InterfaceModule].[VocabularyLookup] vl ON vld.VocabularyLookupKey = vl.VocabularyLookupKey
    ORDER BY vl.CustomerSystemName, vl.CustomerTableName
""")
for row in cursor.fetchall():
    print(f"  [{row[4]}].[{row[5]}].[{row[6]}]: '{row[0]}' → '{row[1]}' (Id={row[2]}, CS={row[3]})")

conn.close()
