"""
Query VocabularyLookup and VocabularyLookupDisplayNames to understand
what mappings are available for MedicaidProvider.
"""
import pyodbc
import json
import os

SERVER = "mcs-mst-carity-v1-04065-appdb.cw1uwwm8ou9t.us-east-1.rds.amazonaws.com"
DATABASE = "WiDHS.Qc.Interface.Carity.ToolTesting"


def get_connection():
    conn_str = (
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={SERVER};"
        f"DATABASE={DATABASE};"
        f"Trusted_Connection=yes;"
        f"TrustServerCertificate=yes;"
        f"Connection Timeout=30;"
    )
    return pyodbc.connect(conn_str)


def main():
    conn = get_connection()
    cursor = conn.cursor()

    # Get all VocabularyLookup entries for MedicaidProvider
    print("=== VocabularyLookup entries for MedicaidProvider ===\n")
    cursor.execute("""
        SELECT vl.VocabularyLookupKey, vl.CustomerSystemName, vl.CustomerTableName, vl.CustomerColumnName
        FROM [InterfaceModule].[VocabularyLookup] vl
        WHERE vl.CustomerSystemName LIKE '%Medicaid%' OR vl.CustomerSystemName LIKE '%Provider%'
        ORDER BY vl.CustomerSystemName, vl.CustomerTableName, vl.CustomerColumnName
    """)
    vocab_keys = []
    for row in cursor.fetchall():
        print(f"  {row[1]}.{row[2]}.{row[3]} (Key: {row[0]})")
        vocab_keys.append({
            "key": str(row[0]),
            "system": row[1],
            "table": row[2],
            "column": row[3],
        })

    # Get sample display name mappings for each vocabulary key
    print(f"\n\n=== Sample VocabularyLookupDisplayNames (first 5 per key) ===\n")
    
    vocab_data = {}
    for vk in vocab_keys:
        cursor.execute("""
            SELECT TOP 10 DisplayName, Identifier, CodeSystemIdentifier, CustomerValue
            FROM [InterfaceModule].[VocabularyLookupDisplayNames]
            WHERE VocabularyLookupKey = ?
            ORDER BY CustomerValue
        """, vk["key"])
        
        mappings = []
        print(f"\n  [{vk['system']}].[{vk['table']}].[{vk['column']}]:")
        for row in cursor.fetchall():
            print(f"    '{row[3]}' → DisplayName='{row[0]}', Identifier={row[1]}, CodeSystem={row[2]}")
            mappings.append({
                "customer_value": row[3],
                "display_name": row[0],
                "identifier": str(row[1]),
                "code_system_identifier": str(row[2]),
            })
        
        vocab_data[f"{vk['system']}.{vk['table']}.{vk['column']}"] = {
            "key": vk["key"],
            "mappings": mappings,
        }

    # Save to JSON for reference
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vocabulary_snapshot.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(vocab_data, f, indent=2)
    
    print(f"\n\nSaved vocabulary snapshot to: {output_path}")
    print(f"Total lookup keys: {len(vocab_keys)}")
    
    conn.close()


if __name__ == "__main__":
    main()
