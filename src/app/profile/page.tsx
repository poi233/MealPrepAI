"use client";

import UserProfileForm from "@/components/profile/UserProfileForm";
import { UserCog } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <section className="text-center py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <UserCog size={40} className="text-primary"/>
            <h1 className="text-4xl font-bold text-primary">
              Your Profile
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Manage your dietary preferences here. These settings will help tailor your meal plans.
          </p>
        </div>
      </section>
      
      <section>
        <UserProfileForm />
      </section>
    </div>
  );
}
