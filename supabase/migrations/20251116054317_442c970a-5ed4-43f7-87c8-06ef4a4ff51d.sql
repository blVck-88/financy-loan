-- 1. Drop the old, insecure policies
DROP POLICY IF EXISTS "Authenticated users can view repayment schedules" ON public.repayment_schedule;
DROP POLICY IF EXISTS "System can manage repayment schedules" ON public.repayment_schedule;
DROP POLICY IF EXISTS "Authenticated users can view repayments" ON public.repayments;
DROP POLICY IF EXISTS "Authenticated users can record repayments" ON public.repayments;

-- 2. Create new, secure, role-based policies
-- (Allows all defined roles to view data)
CREATE POLICY "Users with roles can view repayments" ON public.repayments
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'loan_officer') OR
    public.has_role(auth.uid(), 'accountant') OR
    public.has_role(auth.uid(), 'collector')
  );

CREATE POLICY "Users with roles can view repayment schedules" ON public.repayment_schedule
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'loan_officer') OR
    public.has_role(auth.uid(), 'accountant') OR
    public.has_role(auth.uid(), 'collector')
  );

-- (Allows only 'accountant', 'collector', or 'admin' to create/update)
CREATE POLICY "Users can record repayments" ON public.repayments
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'accountant') OR
    public.has_role(auth.uid(), 'collector')
  );

CREATE POLICY "Users can update repayment schedules" ON public.repayment_schedule
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'accountant') OR
    public.has_role(auth.uid(), 'collector')
  );

-- (This policy is needed for the NewLoan.tsx page to create the schedule)
CREATE POLICY "Users can create repayment schedules" ON public.repayment_schedule
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'loan_officer')
  );