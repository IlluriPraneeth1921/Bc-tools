"""Extract text from the ICD-D12 PDF specification."""
import PyPDF2
import sys
import os

pdf_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "doc", "specs", "WI DHS MES CMM_ICD-D12 FSIA File_v1.0_Approved.pdf"
)

with open(pdf_path, "rb") as f:
    reader = PyPDF2.PdfReader(f)
    print(f"Pages: {len(reader.pages)}")
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            print(f"\n--- Page {i+1} ---")
            print(text)
