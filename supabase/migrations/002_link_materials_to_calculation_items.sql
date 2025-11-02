-- Add a foreign key for materials to the calculation_items table
ALTER TABLE public.calculation_items
ADD COLUMN material_id uuid NULL,
ADD CONSTRAINT fk_material
  FOREIGN KEY (material_id)
  REFERENCES public.materials(id)
  ON DELETE SET NULL; -- If a material is deleted, don't delete the calculation item, just unlink it.