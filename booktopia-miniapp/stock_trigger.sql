-- ============================================================
-- Auto-decrement stock when orders are placed
-- Restores stock when orders are cancelled
-- ============================================================

-- Function: decrement stock for each item in a new order
CREATE OR REPLACE FUNCTION decrement_book_stock()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  book_qty INT;
BEGIN
  -- Only run on new orders (INSERT) or status change to cancelled (UPDATE)
  IF TG_OP = 'INSERT' THEN
    -- Decrement stock for each item
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      book_qty := COALESCE((item->>'qty')::INT, 1);
      UPDATE books
        SET stock = GREATEST(stock - book_qty, 0)
        WHERE id = (item->>'book_id')::UUID
          AND stock IS NOT NULL;  -- Only decrement if stock is tracked (not unlimited)
    END LOOP;
  END IF;

  -- If order is being cancelled, restore stock
  IF TG_OP = 'UPDATE'
     AND OLD.status IS DISTINCT FROM 'cancelled'
     AND NEW.status = 'cancelled'
  THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      book_qty := COALESCE((item->>'qty')::INT, 1);
      UPDATE books
        SET stock = stock + book_qty
        WHERE id = (item->>'book_id')::UUID
          AND stock IS NOT NULL;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (safe to re-run)
DROP TRIGGER IF EXISTS trg_decrement_stock ON miniapp_orders;

-- Create trigger on miniapp_orders
CREATE TRIGGER trg_decrement_stock
  AFTER INSERT OR UPDATE ON miniapp_orders
  FOR EACH ROW
  EXECUTE FUNCTION decrement_book_stock();
