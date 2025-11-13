"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";
import DashboardLayout from "@/components/shared/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X } from "lucide-react";

export default function EditProfile() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const currentUser = useQuery(api.profiles.getCurrentUserProfile);
  const updateProfile = useMutation(api.profiles.updateProfile);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    bio: "",
    location: "",
    website: "",
    avatarUrl: "",
    bannerUrl: "",
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // File upload states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const shouldRedirect = !isLoading && !isAuthenticated;

  useEffect(() => {
    if (shouldRedirect) {
      void router.push("/signin");
    }
  }, [router, shouldRedirect]);

  if (shouldRedirect) {
    return null;
  }

  // Initialize form data when profile loads
  useEffect(() => {
    if (currentUser) {
      setFormData({
        username: currentUser.username || "",
        displayName: currentUser.displayName || "",
        bio: currentUser.bio || "",
        location: currentUser.location || "",
        website: currentUser.website || "",
        avatarUrl: currentUser.avatarUrl || "",
        bannerUrl: currentUser.bannerUrl || "",
      });
      setAvatarPreview(currentUser.avatarUrl || "");
      setBannerPreview(currentUser.bannerUrl || "");
    }
  }, [currentUser]);

  if (isLoading || !currentUser) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setMessage(null); // Clear any existing message
  };

  const handleFileUpload = async (
    file: File,
    type: 'avatar' | 'banner'
  ): Promise<{ success: true; storageId: string }> => {
    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();
      return { success: true, storageId };
    } catch (error) {
      console.error(`${type} upload failed:`, error);
      throw error;
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage({ type: "error", text: "Please select an image file" });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: "error", text: "Image must be smaller than 5MB" });
        return;
      }

      setAvatarFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setMessage(null);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage({ type: "error", text: "Please select an image file" });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ type: "error", text: "Banner image must be smaller than 10MB" });
        return;
      }

      setBannerFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setBannerPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);

    try {
      // Validate required fields
      if (!formData.displayName.trim()) {
        throw new Error("Display name is required");
      }

      if (!formData.username.trim()) {
        throw new Error("Username is required");
      }

      // Validate username format
      const username = formData.username.toLowerCase().trim();
      if (!username.match(/^[a-z0-9_]+$/)) {
        throw new Error("Username can only contain letters, numbers, and underscores");
      }

      if (username.length < 3) {
        throw new Error("Username must be at least 3 characters long");
      }

      if (username.length > 15) {
        throw new Error("Username must be 15 characters or less");
      }

      // Validate website URL format if provided
      if (formData.website && !isValidUrl(formData.website)) {
        throw new Error("Please enter a valid website URL");
      }

      // Handle file uploads
      let avatarStorageId: string | undefined;
      let bannerStorageId: string | undefined;

      if (avatarFile) {
        setIsUploadingAvatar(true);
        try {
          const { storageId } = await handleFileUpload(avatarFile, 'avatar');
          avatarStorageId = storageId;
        } catch (error) {
          console.error('Failed to upload avatar file:', error);
          const errorMessage = 'Failed to upload avatar. Please try again.';
          setMessage({ type: "error", text: errorMessage });
          throw new Error(errorMessage);
        } finally {
          setIsUploadingAvatar(false);
        }
      }

      if (bannerFile) {
        setIsUploadingBanner(true);
        try {
          const { storageId } = await handleFileUpload(bannerFile, 'banner');
          bannerStorageId = storageId;
        } catch (error) {
          console.error('Failed to upload banner file:', error);
          const errorMessage = 'Failed to upload banner. Please try again.';
          setMessage({ type: "error", text: errorMessage });
          throw new Error(errorMessage);
        } finally {
          setIsUploadingBanner(false);
        }
      }

      const result = await updateProfile({
        username: formData.username.trim(),
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim() || undefined,
        location: formData.location.trim() || undefined,
        website: formData.website.trim() || undefined,
        avatarUrl: !avatarFile ? (formData.avatarUrl.trim() || undefined) : undefined,
        bannerUrl: !bannerFile ? (formData.bannerUrl.trim() || undefined) : undefined,
        avatarStorageId: avatarStorageId as Id<"_storage"> | undefined,
        bannerStorageId: bannerStorageId as Id<"_storage"> | undefined,
      });

      setMessage({ type: "success", text: "Profile updated successfully!" });

      // Redirect to the new username URL after a short delay
      setTimeout(() => {
        router.push(`/profile/${result.newUsername || formData.username}`);
      }, 1500);

      // @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to update profile" });
    } finally {
      setIsUpdating(false);
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <PageHeader
          title="Edit Profile"
          description={`@${currentUser.username}`}
        />

        {/* Profile Edit Form */}
        <div className="space-y-6">
          {/* Profile Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Preview</CardTitle>
              <CardDescription>
                See how your profile will appear to others
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Banner Preview */}
              <div className="relative h-32 bg-gradient-to-br from-primary/20 to-background rounded-lg mb-4 overflow-hidden">
                {bannerPreview && (
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                {isUploadingBanner && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Avatar and Info Preview */}
              <div className="flex items-start gap-4">
                <div className="relative w-20 h-20 rounded-full border-4 border-background bg-muted flex items-center justify-center text-xl font-bold flex-shrink-0 overflow-hidden -mt-10">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-muted-foreground">{currentUser.username[0].toUpperCase()}</span>
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-lg font-bold">{formData.displayName || "Display Name"}</h3>
                  <p className="text-sm text-muted-foreground">@{formData.username || "username"}</p>
                  {formData.bio && <p className="text-sm mt-3">{formData.bio}</p>}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-3">
                    {formData.location && <span>📍 {formData.location}</span>}
                    {formData.website && <span>🔗 {formData.website}</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Form */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and profile details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">
                    Username <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <Input
                      id="username"
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleInputChange("username", e.target.value.toLowerCase())}
                      className="pl-8"
                      placeholder="your_username"
                      pattern="[a-z0-9_]+"
                      minLength={3}
                      maxLength={15}
                      required
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Only letters, numbers, and underscores</span>
                    <span>{formData.username.length}/15</span>
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="displayName">
                    Display Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="displayName"
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange("displayName", e.target.value)}
                    placeholder="Your display name"
                    maxLength={50}
                    required
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {formData.displayName.length}/50
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange("bio", e.target.value)}
                    placeholder="Tell people about yourself"
                    rows={4}
                    maxLength={160}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {formData.bio.length}/160
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="Where are you located?"
                    maxLength={30}
                  />
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    placeholder="https://your-website.com"
                  />
                </div>

                {/* Avatar Upload */}
                <div className="space-y-2">
                  <Label>Profile Picture</Label>
                  <div className="flex gap-3">
                    <input
                      id="avatarFile"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('avatarFile')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Image
                    </Button>
                    {avatarFile && (
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        {avatarFile.name}
                        <X
                          className="w-4 h-4 cursor-pointer hover:text-foreground"
                          onClick={() => {
                            setAvatarFile(null);
                            setAvatarPreview(currentUser.avatarUrl || "");
                          }}
                        />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, or GIF. Max 5MB. Recommended: 400x400px
                  </p>
                  {!avatarFile && (
                    <>
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">Or</span>
                        </div>
                      </div>
                      <Input
                        id="avatarUrl"
                        type="url"
                        value={formData.avatarUrl}
                        onChange={(e) => handleInputChange("avatarUrl", e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter a direct link to an image
                      </p>
                    </>
                  )}
                </div>

                {/* Banner Upload */}
                <div className="space-y-2">
                  <Label>Banner Image</Label>
                  <div className="flex gap-3">
                    <input
                      id="bannerFile"
                      type="file"
                      accept="image/*"
                      onChange={handleBannerChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('bannerFile')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Image
                    </Button>
                    {bannerFile && (
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        {bannerFile.name}
                        <X
                          className="w-4 h-4 cursor-pointer hover:text-foreground"
                          onClick={() => {
                            setBannerFile(null);
                            setBannerPreview(currentUser.bannerUrl || "");
                          }}
                        />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, or GIF. Max 10MB. Recommended: 1500x500px
                  </p>
                  {!bannerFile && (
                    <>
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">Or</span>
                        </div>
                      </div>
                      <Input
                        id="bannerUrl"
                        type="url"
                        value={formData.bannerUrl}
                        onChange={(e) => handleInputChange("bannerUrl", e.target.value)}
                        placeholder="https://example.com/banner.jpg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter a direct link to an image
                      </p>
                    </>
                  )}
                </div>

                {/* Message Display */}
                {message && (
                  <div className={`p-3 rounded-md border text-sm ${
                    message.type === "success"
                      ? "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400"
                      : "border-destructive/50 bg-destructive/10 text-destructive"
                  }`}>
                    {message.text}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUpdating || isUploadingAvatar || isUploadingBanner || !formData.displayName.trim() || !formData.username.trim()}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : isUploadingAvatar ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading Avatar...
                      </>
                    ) : isUploadingBanner ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading Banner...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}