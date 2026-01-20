# Update Frontend Shipping Display

## Goal Description
Display the sum of dimensions (length + width + height) in the "発送内容" section of the frontend `ShippingResult` component to provide clearer size information (e.g., for 60-size, 80-size checks).

## Propose Changes
### Frontend
#### [MODIFY] [ShippingResult.jsx](file:///Users/fatboy/smartship/frontend/src/components/ShippingResult.jsx)
- Calculate `totalDimension = length + width + height`.
- Update the display in the "発送内容" section to include the total dimension.

## Verification Plan
### Manual Verification
- Review the code logic.
