import fitz

doc = fitz.open(r'c:\Whitelisted\Projects\WIDHS Testing\Medicaid Provider File Extract Layout 01.12.26.pdf')
for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text()
    print(f'--- PAGE {page_num + 1} ---')
    print(text)
    print()
