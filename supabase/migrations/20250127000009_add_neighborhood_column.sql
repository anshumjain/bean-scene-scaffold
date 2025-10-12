-- Add neighborhood column to cafes table
ALTER TABLE cafes ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(255);

-- Create index for neighborhood searches
CREATE INDEX IF NOT EXISTS idx_cafes_neighborhood ON cafes(neighborhood);

-- Update existing cafes with neighborhood data based on coordinates and address
UPDATE cafes 
SET neighborhood = CASE
  -- Downtown area
  WHEN (latitude BETWEEN 29.75 AND 29.77) AND (longitude BETWEEN -95.38 AND -95.36) THEN 'Downtown'
  
  -- EaDo (East Downtown)
  WHEN (latitude BETWEEN 29.73 AND 29.75) AND (longitude BETWEEN -95.30 AND -95.28) THEN 'EaDo'
  
  -- Montrose
  WHEN (latitude BETWEEN 29.72 AND 29.76) AND (longitude BETWEEN -95.40 AND -95.38) THEN 'Montrose'
  
  -- Museum District
  WHEN (latitude BETWEEN 29.71 AND 29.74) AND (longitude BETWEEN -95.39 AND -95.37) THEN 'Museum District'
  
  -- Heights
  WHEN (latitude BETWEEN 29.79 AND 29.82) AND (longitude BETWEEN -95.41 AND -95.38) THEN 'Heights'
  
  -- North Heights
  WHEN (latitude BETWEEN 29.82 AND 29.85) AND (longitude BETWEEN -95.41 AND -95.38) THEN 'North Heights'
  
  -- Rice Village
  WHEN (latitude BETWEEN 29.71 AND 29.73) AND (longitude BETWEEN -95.41 AND -95.39) THEN 'Rice Village'
  
  -- West University
  WHEN (latitude BETWEEN 29.71 AND 29.73) AND (longitude BETWEEN -95.44 AND -95.41) THEN 'West University'
  
  -- Midtown
  WHEN (latitude BETWEEN 29.72 AND 29.75) AND (longitude BETWEEN -95.39 AND -95.36) THEN 'Midtown'
  
  -- Medical Center / TMC
  WHEN (latitude BETWEEN 29.70 AND 29.72) AND (longitude BETWEEN -95.41 AND -95.38) THEN 'Medical Center'
  
  -- Near Northside
  WHEN (latitude BETWEEN 29.79 AND 29.82) AND (longitude BETWEEN -95.31 AND -95.28) THEN 'Near Northside'
  
  -- East End
  WHEN (latitude BETWEEN 29.72 AND 29.76) AND (longitude BETWEEN -95.31 AND -95.28) THEN 'East End'
  
  -- Galleria
  WHEN (latitude BETWEEN 29.73 AND 29.75) AND (longitude BETWEEN -95.47 AND -95.44) THEN 'Galleria'
  
  -- Greenway Plaza
  WHEN (latitude BETWEEN 29.72 AND 29.74) AND (longitude BETWEEN -95.43 AND -95.40) THEN 'Greenway Plaza'
  
  -- Bellaire
  WHEN (latitude BETWEEN 29.70 AND 29.72) AND (longitude BETWEEN -95.47 AND -95.44) THEN 'Bellaire'
  
  -- Westchase
  WHEN (latitude BETWEEN 29.68 AND 29.72) AND (longitude BETWEEN -95.57 AND -95.54) THEN 'Westchase'
  
  -- Memorial
  WHEN (latitude BETWEEN 29.77 AND 29.79) AND (longitude BETWEEN -95.53 AND -95.50) THEN 'Memorial'
  
  -- Memorial City
  WHEN (latitude BETWEEN 29.77 AND 29.79) AND (longitude BETWEEN -95.53 AND -95.50) THEN 'Memorial City'
  
  -- Spring Branch
  WHEN (latitude BETWEEN 29.80 AND 29.83) AND (longitude BETWEEN -95.52 AND -95.49) THEN 'Spring Branch'
  
  -- Clear Lake
  WHEN (latitude BETWEEN 29.55 AND 29.57) AND (longitude BETWEEN -95.10 AND -95.07) THEN 'Clear Lake'
  
  -- NASA
  WHEN (latitude BETWEEN 29.55 AND 29.57) AND (longitude BETWEEN -95.10 AND -95.07) THEN 'NASA'
  
  -- Webster
  WHEN (latitude BETWEEN 29.54 AND 29.56) AND (longitude BETWEEN -95.12 AND -95.09) THEN 'Webster'
  
  -- League City
  WHEN (latitude BETWEEN 29.54 AND 29.56) AND (longitude BETWEEN -95.12 AND -95.09) THEN 'League City'
  
  -- Katy
  WHEN (latitude BETWEEN 29.78 AND 29.80) AND (longitude BETWEEN -95.84 AND -95.80) THEN 'Katy'
  
  -- Sugar Land
  WHEN (latitude BETWEEN 29.61 AND 29.63) AND (longitude BETWEEN -95.64 AND -95.60) THEN 'Sugar Land'
  
  -- Missouri City
  WHEN (latitude BETWEEN 29.60 AND 29.62) AND (longitude BETWEEN -95.64 AND -95.60) THEN 'Missouri City'
  
  -- Pearland
  WHEN (latitude BETWEEN 29.56 AND 29.58) AND (longitude BETWEEN -95.30 AND -95.26) THEN 'Pearland'
  
  -- The Woodlands
  WHEN (latitude BETWEEN 30.16 AND 30.18) AND (longitude BETWEEN -95.47 AND -95.44) THEN 'The Woodlands'
  
  -- Cypress
  WHEN (latitude BETWEEN 29.81 AND 29.83) AND (longitude BETWEEN -95.65 AND -95.61) THEN 'Cypress'
  
  -- Humble
  WHEN (latitude BETWEEN 30.01 AND 30.03) AND (longitude BETWEEN -95.16 AND -95.12) THEN 'Humble'
  
  -- Atascocita
  WHEN (latitude BETWEEN 30.01 AND 30.03) AND (longitude BETWEEN -95.16 AND -95.12) THEN 'Atascocita'
  
  -- Pasadena
  WHEN (latitude BETWEEN 29.61 AND 29.63) AND (longitude BETWEEN -95.22 AND -95.18) THEN 'Pasadena'
  
  -- Deer Park
  WHEN (latitude BETWEEN 29.61 AND 29.63) AND (longitude BETWEEN -95.22 AND -95.18) THEN 'Deer Park'
  
  -- Rosenberg
  WHEN (latitude BETWEEN 29.52 AND 29.54) AND (longitude BETWEEN -95.69 AND -95.65) THEN 'Rosenberg'
  
  -- Richmond
  WHEN (latitude BETWEEN 29.52 AND 29.54) AND (longitude BETWEEN -95.69 AND -95.65) THEN 'Richmond'
  
  -- Fallback: extract from address if coordinates don't match
  WHEN address ILIKE '%montrose%' THEN 'Montrose'
  WHEN address ILIKE '%heights%' THEN 'Heights'
  WHEN address ILIKE '%downtown%' THEN 'Downtown'
  WHEN address ILIKE '%rice village%' OR address ILIKE '%rice university%' THEN 'Rice Village'
  WHEN address ILIKE '%west university%' THEN 'West University'
  WHEN address ILIKE '%midtown%' THEN 'Midtown'
  WHEN address ILIKE '%medical center%' OR address ILIKE '%tmc%' THEN 'Medical Center'
  WHEN address ILIKE '%galleria%' THEN 'Galleria'
  WHEN address ILIKE '%bellaire%' THEN 'Bellaire'
  WHEN address ILIKE '%memorial%' THEN 'Memorial'
  WHEN address ILIKE '%spring branch%' THEN 'Spring Branch'
  WHEN address ILIKE '%clear lake%' THEN 'Clear Lake'
  WHEN address ILIKE '%nasa%' THEN 'NASA'
  WHEN address ILIKE '%webster%' THEN 'Webster'
  WHEN address ILIKE '%league city%' THEN 'League City'
  WHEN address ILIKE '%katy%' THEN 'Katy'
  WHEN address ILIKE '%sugar land%' THEN 'Sugar Land'
  WHEN address ILIKE '%missouri city%' THEN 'Missouri City'
  WHEN address ILIKE '%pearland%' THEN 'Pearland'
  WHEN address ILIKE '%woodlands%' THEN 'The Woodlands'
  WHEN address ILIKE '%cypress%' THEN 'Cypress'
  WHEN address ILIKE '%humble%' THEN 'Humble'
  WHEN address ILIKE '%atascocita%' THEN 'Atascocita'
  WHEN address ILIKE '%pasadena%' THEN 'Pasadena'
  WHEN address ILIKE '%deer park%' THEN 'Deer Park'
  WHEN address ILIKE '%rosenberg%' THEN 'Rosenberg'
  WHEN address ILIKE '%richmond%' THEN 'Richmond'
  
  -- Default fallback
  ELSE 'Houston'
END
WHERE neighborhood IS NULL OR neighborhood = '';
