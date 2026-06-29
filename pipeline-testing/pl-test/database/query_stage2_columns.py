"""
Query INFORMATION_SCHEMA to get column definitions for all Stage 2 parsed tables.
Saves results to database/stage2_schema.json for use by the expected state generator.
"""
import pyodbc
import json
import os

SERVER = "mcs-mst-carity-v1-04065-appdb.cw1uwwm8ou9t.us-east-1.rds.amazonaws.com"
DATABASE = "WiDHS.Qc.Interface.Carity.ToolTesting"

STAGE2_TABLES = [
    "MedicaidProviderRaw",
    "MedicaidProviderMain",
    "MedicaidProviderAddress",
    "MedicaidProviderContact",
    "MedicaidProviderTin",
    "MedicaidProviderContract",
    "MedicaidProviderTypeAndSpecialty",
    "MedicaidProviderNpi",
    "MedicaidProviderTaxonomy",
    "MedicaidProviderAcaPaymentHold",
    "MedicaidProviderWaiverProgram",
    "MedicaidProviderWaiverService",
    "MedicaidProviderCountyAndTribeServed",
    "MedicaidProviderLicense",
    "MedicaidProviderCertificationAndCredentials",
]


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


def query_columns():
    conn = get_connection()
    cursor = conn.cursor()

    schema_data = {}

    for table_name in STAGE2_TABLES:
        cursor.execute("""
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, 
                   IS_NULLABLE, ORDINAL_POSITION, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'CustomerInterfaceModule'
              AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        """, table_name)

        columns = []
        for row in cursor.fetchall():
            col = {
                "name": row[0],
                "data_type": row[1],
                "max_length": row[2],
                "nullable": row[3] == "YES",
                "ordinal": row[4],
                "default": str(row[5]) if row[5] else None,
            }
            columns.append(col)

        schema_data[table_name] = {
            "schema": "CustomerInterfaceModule",
            "database": DATABASE,
            "columns": columns,
            "column_count": len(columns),
        }

        print(f"  {table_name}: {len(columns)} columns")

    conn.close()
    return schema_data


def main():
    print(f"Querying Stage 2 table schemas from [{DATABASE}].[CustomerInterfaceModule]...")
    print()

    schema_data = query_columns()

    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "stage2_schema.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(schema_data, f, indent=2)

    print(f"\nSaved to: {output_path}")
    print(f"Total tables: {len(schema_data)}")
    total_cols = sum(t["column_count"] for t in schema_data.values())
    print(f"Total columns: {total_cols}")


if __name__ == "__main__":
    main()
