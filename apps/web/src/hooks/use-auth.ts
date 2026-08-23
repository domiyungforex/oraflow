"use client";

import { useUser, useAuth, useOrganization } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Hook for authentication state and methods
 */
export function useAuthState() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();

  return {
    isLoading: !isLoaded || !isUserLoaded || !isOrgLoaded,
    isSignedIn,
    user,
    organization,
    getToken,
  };
}

/**
 * Hook for getting the current user's business/tenant
 */
export function useTenant() {
  const { user, isLoaded } = useUser();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user) {
      setIsLoading(false);
      return;
    }

    // In a real app, you'd fetch the user's business from your API
    // For now, we'll use the organization ID from Clerk
    const fetchBusiness = async () => {
      try {
        // This would be an API call to get the user's business
        // const response = await fetch('/api/auth/business');
        // const data = await response.json();
        // setBusinessId(data.businessId);

        // For now, use a placeholder
        setBusinessId(user.id);
      } catch (error) {
        console.error("Failed to fetch business:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusiness();
  }, [user, isLoaded]);

  return {
    businessId,
    isLoading,
  };
}

/**
 * Hook for protected route navigation
 */
export function useProtectedRoute() {
  const { isSignedIn, isLoading } = useAuthState();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isSignedIn, isLoading, router]);

  return {
    isAuthorized: isSignedIn,
    isLoading,
  };
}

/**
 * Hook for user profile operations
 */
export function useUserProfile() {
  const { user, isLoaded } = useUser();

  const updateProfile = async (data: {
    firstName?: string;
    lastName?: string;
  }) => {
    if (!user) return;

    await user.update({
      firstName: data.firstName,
      lastName: data.lastName,
    });
  };

  const updateAvatar = async (file: File) => {
    if (!user) return;

    await user.setProfileImage({ file });
  };

  return {
    user,
    isLoading: !isLoaded,
    updateProfile,
    updateAvatar,
  };
}

/**
 * Hook for organization/team management
 */
export function useTeam() {
  const { organization, isLoaded } = useOrganization();
  const [members, setMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const inviteMember = async (email: string, role: "org:admin" | "org:member") => {
    if (!organization) return;

    await organization.inviteMember({ emailAddress: email, role });
  };

  const removeMember = async (memberId: string) => {
    if (!organization) return;

    await organization.removeMember(memberId);
  };

  const updateMemberRole = async (
    memberId: string,
    role: "org:admin" | "org:member"
  ) => {
    if (!organization) return;

    await organization.updateMember({ userId: memberId, role });
  };

  return {
    organization,
    isLoading: !isLoaded,
    members,
    isLoadingMembers,
    inviteMember,
    removeMember,
    updateMemberRole,
  };
}

/**
 * Hook for API authentication
 */
export function useApiAuth() {
  const { getToken } = useAuth();

  const getAuthHeaders = async () => {
    const token = await getToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const authenticatedFetch = async (
    url: string,
    options: RequestInit = {}
  ) => {
    const headers = await getAuthHeaders();

    return fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
  };

  return {
    getAuthHeaders,
    authenticatedFetch,
  };
}
