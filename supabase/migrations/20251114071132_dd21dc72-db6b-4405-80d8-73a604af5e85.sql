-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'loan_officer', 'accountant', 'collector');

-- Create enum for loan status
CREATE TYPE public.loan_status AS ENUM ('pending_approval', 'approved', 'disbursed', 'active', 'cleared', 'rejected', 'defaulted');

-- Create enum for repayment frequency
CREATE TYPE public.repayment_frequency AS ENUM ('daily', 'weekly', 'monthly');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create borrowers table
CREATE TABLE public.borrowers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  id_number TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  guarantor_name TEXT,
  guarantor_phone TEXT,
  guarantor_address TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create loans table
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id UUID REFERENCES public.borrowers(id) ON DELETE CASCADE NOT NULL,
  loan_officer_id UUID REFERENCES public.profiles(id),
  principal DECIMAL(15, 2) NOT NULL CHECK (principal > 0),
  interest_rate DECIMAL(5, 2) NOT NULL CHECK (interest_rate >= 0),
  term_months INTEGER NOT NULL CHECK (term_months > 0),
  frequency repayment_frequency NOT NULL DEFAULT 'monthly',
  disbursement_date DATE NOT NULL,
  total_interest DECIMAL(15, 2) NOT NULL,
  total_payable DECIMAL(15, 2) NOT NULL,
  instalment_amount DECIMAL(15, 2) NOT NULL,
  status loan_status NOT NULL DEFAULT 'pending_approval',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create repayment_schedule table
CREATE TABLE public.repayment_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  instalment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount_due DECIMAL(15, 2) NOT NULL,
  amount_paid DECIMAL(15, 2) DEFAULT 0,
  penalty DECIMAL(15, 2) DEFAULT 0,
  is_paid BOOLEAN DEFAULT FALSE,
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(loan_id, instalment_number)
);

-- Create repayments table
CREATE TABLE public.repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  schedule_id UUID REFERENCES public.repayment_schedule(id),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repayment_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repayments ENABLE ROW LEVEL SECURITY;

-- Create function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for borrowers
CREATE POLICY "Authenticated users can view borrowers" ON public.borrowers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Loan officers and admins can create borrowers" ON public.borrowers
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'loan_officer')
  );

CREATE POLICY "Loan officers and admins can update borrowers" ON public.borrowers
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'loan_officer')
  );

-- RLS Policies for loans
CREATE POLICY "Authenticated users can view loans" ON public.loans
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Loan officers and admins can create loans" ON public.loans
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'loan_officer')
  );

CREATE POLICY "Loan officers and admins can update loans" ON public.loans
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'loan_officer')
  );

-- RLS Policies for repayment_schedule
CREATE POLICY "Authenticated users can view repayment schedules" ON public.repayment_schedule
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage repayment schedules" ON public.repayment_schedule
  FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS Policies for repayments
CREATE POLICY "Authenticated users can view repayments" ON public.repayments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can record repayments" ON public.repayments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_borrowers_updated_at BEFORE UPDATE ON public.borrowers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();