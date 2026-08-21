# Products Table Error Fix

## Issue
Runtime error: `Cannot read properties of undefined (reading 'material_types')`

The error occurred because the code was attempting to access `row.facets.material_types` without checking if `row.facets` exists first. This can happen when:
- API returns incomplete data
- Data is still loading
- Network errors occur
- Backend returns unexpected structure

## Root Cause
The TypeScript type `ProductListItem` declares `facets: ProductFacets` as required, but at runtime the API might return products without the `facets` field populated, or with partial data.

## Solution
Added defensive programming checks throughout the `products-table.tsx` component to gracefully handle missing or incomplete `facets` data.

## Changes Made

### 1. ProductTableView - Main table rows
**Location**: Line ~437 in `products-table.tsx`

```typescript
{rows.map((row) => {
  // Defensive check for missing facets data
  if (!row.facets) {
    console.warn("Product row missing facets:", row);
    return null;
  }

  const category = primaryCategory(
    row.facets.material_types,
    row.is_packaging,
  );
  // ... rest of component
```

**Impact**: Rows with missing facets are skipped and logged to console for debugging.

### 2. ProductCardView - Card grid view
**Location**: Line ~609 in `products-table.tsx`

```typescript
{rows.map((row) => {
  // Defensive check for missing facets data
  if (!row.facets) {
    console.warn("Product row missing facets:", row);
    return null;
  }
  // ... rest of component
```

**Impact**: Cards with missing facets are skipped and logged to console.

### 3. CategoryCell component
**Location**: Line ~734 in `products-table.tsx`

```typescript
function CategoryCell({ row }: { row: ProductListItem }) {
  // Defensive check for missing facets
  if (!row.facets || !row.facets.material_types) {
    return <Dash />;
  }

  const category = primaryCategory(row.facets.material_types, row.is_packaging);
  const extra = Math.max(0, row.facets.material_types.length - 1);
  // ... rest of component
```

**Impact**: Shows a dash (—) when facets or material_types are missing.

### 4. CountryCell component
**Location**: Line ~760 in `products-table.tsx`

```typescript
function CountryCell({ row }: { row: ProductListItem }) {
  // Defensive check for missing facets
  if (!row.facets || !row.facets.countries) {
    return <Dash />;
  }

  const [first, ...rest] = row.facets.countries;
  if (!first) return <Dash />;
  // ... rest of component
```

**Impact**: Shows a dash (—) when facets or countries are missing.

### 5. Compendia badges (USP, BP, EP, etc.) - Table view
**Location**: Line ~519 in `products-table.tsx`

```typescript
{row.facets?.compendia && row.facets.compendia.length > 0 ? (
  // ... render badges
) : (
  <Dash />
)}
```

**Impact**: Uses optional chaining to safely check for compendia array.

### 6. Compendia badges - Card view
**Location**: Line ~669 in `products-table.tsx`

```typescript
{row.facets?.compendia && row.facets.compendia.slice(0, 2).map((code) => (
  // ... render badges
))}
```

**Impact**: Uses optional chaining to safely render badges in card view.

### 7. Supplier count - Card view
**Location**: Line ~701 in `products-table.tsx`

```typescript
{row.facets?.supplier_count ?? 0}
```

**Impact**: Shows 0 when supplier_count is missing.

### 8. applicationsOf helper function
**Location**: Line ~998 in `products-table.tsx`

```typescript
function applicationsOf(row: ProductListItem): string | null {
  if (row.facets?.applications && row.facets.applications.length > 0) {
    return row.facets.applications.map(applicationLabel).join(", ");
  }
  return row.indication_text || row.therapeutic_classes?.join(", ") || null;
}
```

**Impact**: Uses optional chaining for safe access to applications and therapeutic_classes arrays.

## Best Practices Applied

1. **Optional Chaining (`?.`)**: Used throughout to safely access nested properties
2. **Nullish Coalescing (`??`)**: Provides default values when properties are null/undefined
3. **Early Returns**: Returns fallback UI (Dash component) when data is missing
4. **Console Warnings**: Logs missing data for debugging without breaking the UI
5. **Graceful Degradation**: UI continues to work with partial data

## Testing Recommendations

1. **Test with missing facets**: Verify UI handles products without facets data
2. **Test with partial facets**: Check handling when some facet fields are missing
3. **Test loading states**: Ensure no errors during initial data load
4. **Test network errors**: Verify graceful handling of API failures
5. **Check console logs**: Review warnings for data quality issues

## Why This Matters

In production environments:
- Network issues can cause incomplete data loads
- Backend changes might temporarily break the data contract
- Race conditions during page transitions can expose partially loaded data
- API errors might return 200 status with incomplete response bodies

Defensive programming ensures the UI remains functional even when data is imperfect.

## Future Improvements

Consider these enhancements:
1. **Type guards**: Create runtime validators for ProductListItem
2. **Error boundaries**: Catch and display component-level errors gracefully
3. **Data validation**: Validate API responses with zod/yup schemas
4. **Loading indicators**: Show skeleton loaders for specific missing fields
5. **Retry logic**: Automatically retry failed facets requests
6. **Telemetry**: Track and alert on missing facets data frequency
