# Spec Generation Tools

This folder contains prompts and instructions for using AI to convert interface specification documents (PDF/Excel) into the standard YAML format used by the pl-test Test Data Generator.

## How to Generate a Spec YAML

### Option 1: Use the Kiro Steering File (Recommended)

1. Open a Kiro chat session
2. Reference `#generate-spec-from-document` in your prompt
3. Attach or reference the spec document
4. Say: "Read this specification and generate a YAML spec file"

### Option 2: Use the Prompt Template Below

Copy the prompt from `prompt-template.md` and paste it into any AI chat along with the spec document.

## Output

The generated YAML file should be saved to:
```
pl-test/tools/specs/{interface_type}.yaml
```

## Validation

After generating, load the YAML in the pl-test web UI:
1. Navigate to **Generate Data** page
2. Select the YAML from saved specs
3. Review all sections (fields, code tables, business rules, DB targets)
4. Verify field count and names match the source document
