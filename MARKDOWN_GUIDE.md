# Markdown Usage Guide

Shear supports a rich set of Markdown features to help you format your clipboard content. Below is a guide on how to use the available features.

## 1. Basic Markdown

Standard GitHub Flavored Markdown (GFM) is supported.

*   **Bold**: `**bold**` or `__bold__`
*   **Italic**: `*italic*` or `_italic_`
*   **Strikethrough**: `~~strikethrough~~`
*   **Lists**:
    *   Unordered: `-` or `*`
    *   Ordered: `1.`
*   **Links**: `[Link Text](url)`
*   **Images**: `![Alt Text](url)`
*   **Blockquotes**: `> Quote`
*   **Horizontal Rule**: `---`

## 2. Code Blocks

We use `highlight.js` for syntax highlighting with the `github-dark` theme.

### Basic Code Block

```js
console.log("Hello, World!");
```

````markdown
```js
console.log("Hello, World!");
```
````

### Line Numbers

Add `line-numbers` to the language identifier to show line numbers.

````markdown
```js line-numbers
function add(a, b) {
  return a + b;
}
```
````

### Highlighting Lines

Highlight specific lines using `lines=start-end`.

````markdown
```js line-numbers lines=2-3
function add(a, b) {
  // This line is highlighted
  return a + b;
}
```
````

## 3. Math / LaTeX

We support mathematical expressions using KaTeX.

### Inline Math
Wrap your equation in single dollar signs `$`.

**Example:** $E = mc^2$

**Syntax:** `$E = mc^2$`

### Block Math
Wrap your equation in double dollar signs `$$`.

**Example:**
$$
\sum_{i=0}^n i^2 = \frac{(n^2+n)(2n+1)}{6}
$$

**Syntax:**
```latex
$$
\sum_{i=0}^n i^2 = \frac{(n^2+n)(2n+1)}{6}
$$
```

## 4. Admonitions (Callouts)

Create colorful callout blocks using the `:::` syntax.

**Supported types:** `info`, `success`, `warning`, `error`.

### Basic Syntax

```markdown
:::info
This is an info block.
:::
```

### With Title

```markdown
:::warning[Caution]
Proceed with care!
:::
```

### Default Open/Closed

Admonitions are collapsible. Add `{open}` to make them open by default.

```markdown
:::success[Job Done]{open}
The operation completed successfully.
:::
```

## 5. Advanced Tables

Our tables support row and column spanning.

*   Use `^` in a cell to merge it with the cell above (Rowspan).
*   Use `<` in a cell to merge it with the cell to the left (Colspan).

**Example:**

```markdown
| Header 1 | Header 2 |
| :------- | :------- |
| Cell 1   | Cell 2   |
| ^        | Cell 3   |
| Cell 4   | <        |
```

*   Row 2, Col 1 merges with Row 1, Col 1.
*   Row 3, Col 2 merges with Row 3, Col 1.

## 6. Cute Tables

For a more stylized table appearance, wrap your table in a `:::cute-table` block.

```markdown
:::cute-table
| ID | Name  | Role  |
| -- | ----- | ----- |
| 1  | Alice | Admin |
| 2  | Bob   | User  |
:::
```
