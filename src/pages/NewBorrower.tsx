import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const NewBorrower = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    full_name: "",
    id_number: "",
    phone: "",
    email: "",
    address: "",
    guarantor_name: "",
    guarantor_phone: "",
    guarantor_address: "",
  });

  const createBorrower = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("borrowers").insert({
        ...data,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Borrower created successfully");
      navigate("/borrowers");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create borrower");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBorrower.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/borrowers")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Borrower</h1>
          <p className="text-muted-foreground">Add a new borrower to the system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="id_number">ID Number *</Label>
                <Input
                  id="id_number"
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Guarantor Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guarantor_name">Guarantor Name</Label>
                <Input
                  id="guarantor_name"
                  value={formData.guarantor_name}
                  onChange={(e) => setFormData({ ...formData, guarantor_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guarantor_phone">Guarantor Phone</Label>
                <Input
                  id="guarantor_phone"
                  type="tel"
                  value={formData.guarantor_phone}
                  onChange={(e) => setFormData({ ...formData, guarantor_phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guarantor_address">Guarantor Address</Label>
                <Textarea
                  id="guarantor_address"
                  value={formData.guarantor_address}
                  onChange={(e) => setFormData({ ...formData, guarantor_address: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate("/borrowers")}>
            Cancel
          </Button>
          <Button type="submit" disabled={createBorrower.isPending}>
            {createBorrower.isPending ? "Creating..." : "Create Borrower"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewBorrower;
