'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Loader2, Save } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useAnalyticsStore } from '@/stores/analytics-store'
import { Header } from '@/components/dashboard/header'
import { toast } from 'sonner'

export default function ProfilePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const { company, setCompany } = useAnalyticsStore()

  const [formData, setFormData] = useState({
    company_name: '',
    company_url: '',
    company_description: '',
    unique_value_proposition: '',
    stage_of_company: 'startup',
    revenue: '',
    number_of_employees: '',
    pricing_model: '',
    target_customers: '',
    types_of_products: [{
      product_name: '',
      product_url: '',
      product_description: ''
    }]
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Check authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth')
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch company data on mount
  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!isAuthenticated) return

      try {
        setIsLoading(true)
        const { authenticatedFetch } = await import('@/lib/auth-utils')

        const response = await authenticatedFetch('/api/company', {
          method: 'GET',
        })

        if (!response.ok) {
          if (response.status === 404) {
            toast.error('No company profile found. Please complete onboarding.')
            router.push('/onboarding')
            return
          }
          throw new Error('Failed to fetch company data')
        }

        const result = await response.json()
        const companyData = result.data

        // Update form with fetched data
        setFormData({
          company_name: companyData.company_name || '',
          company_url: companyData.company_url || '',
          company_description: companyData.company_description || '',
          unique_value_proposition: companyData.unique_value_proposition || '',
          stage_of_company: companyData.stage_of_company || 'startup',
          revenue: companyData.revenue || '',
          number_of_employees: companyData.number_of_employees || '',
          pricing_model: companyData.pricing_model || '',
          target_customers: companyData.target_customers || '',
          types_of_products: companyData.types_of_products || [{
            product_name: '',
            product_url: '',
            product_description: ''
          }]
        })

      } catch (error) {
        console.error('Error fetching company data:', error)
        toast.error('Failed to load company data')
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated && !authLoading) {
      fetchCompanyData()
    }
  }, [isAuthenticated, authLoading, router])

  const addProduct = () => {
    setFormData({
      ...formData,
      types_of_products: [
        ...formData.types_of_products,
        {
          product_name: '',
          product_url: '',
          product_description: ''
        }
      ]
    })
  }

  const removeProduct = (index: number) => {
    setFormData({
      ...formData,
      types_of_products: formData.types_of_products.filter((_, i) => i !== index)
    })
  }

  const updateProduct = (index: number, field: string, value: string) => {
    const updatedProducts = [...formData.types_of_products]
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value
    }
    setFormData({
      ...formData,
      types_of_products: updatedProducts
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSaving) return

    try {
      setIsSaving(true)
      const { authenticatedFetch } = await import('@/lib/auth-utils')

      const response = await authenticatedFetch('/api/company', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to update company data')
      }

      const result = await response.json()

      // Update company data in analytics store
      const updatedCompany = {
        id: result.data.company_id,
        ...formData
      }
      setCompany(updatedCompany)

      toast.success('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating company data:', error)
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
          <div className="text-primary text-glow animate-pulse">Loading profile...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary text-glow mb-2">
              Company Profile
            </h1>
            <p className="text-muted-foreground">
              Manage your company information and settings
            </p>
          </div>

          <Card className="p-8 bg-panel border-primary/20 glow">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Basic Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="text-foreground">
                    Company Name *
                  </Label>
                  <Input
                    id="company_name"
                    type="text"
                    placeholder="Your company name"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                    required
                    className="bg-background border-primary/30 focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_url" className="text-foreground">
                    Company Website *
                  </Label>
                  <Input
                    id="company_url"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.company_url}
                    onChange={(e) =>
                      setFormData({ ...formData, company_url: e.target.value })
                    }
                    required
                    className="bg-background border-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_description" className="text-foreground">
                  Company Description *
                </Label>
                <Textarea
                  id="company_description"
                  placeholder="Describe what your company does..."
                  value={formData.company_description}
                  onChange={(e) =>
                    setFormData({ ...formData, company_description: e.target.value })
                  }
                  required
                  className="bg-background border-primary/30 focus:border-primary min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unique_value_proposition" className="text-foreground">
                  Unique Value Proposition *
                </Label>
                <Textarea
                  id="unique_value_proposition"
                  placeholder="What makes your company unique? What problem do you solve better than others?"
                  value={formData.unique_value_proposition}
                  onChange={(e) =>
                    setFormData({ ...formData, unique_value_proposition: e.target.value })
                  }
                  required
                  className="bg-background border-primary/30 focus:border-primary min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stage_of_company" className="text-foreground">
                  Company Stage *
                </Label>
                <Select
                  value={formData.stage_of_company}
                  onValueChange={(value) =>
                    setFormData({ ...formData, stage_of_company: value })
                  }
                >
                  <SelectTrigger className="bg-background border-primary/30 focus:border-primary">
                    <SelectValue placeholder="Select your company stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea Stage</SelectItem>
                    <SelectItem value="startup">Startup</SelectItem>
                    <SelectItem value="growth">Growth Stage</SelectItem>
                    <SelectItem value="expansion">Expansion</SelectItem>
                    <SelectItem value="mature">Mature</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Company Information */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="revenue" className="text-foreground">
                    Annual Revenue
                  </Label>
                  <Input
                    id="revenue"
                    type="text"
                    placeholder="e.g., $1M - $5M"
                    value={formData.revenue}
                    onChange={(e) =>
                      setFormData({ ...formData, revenue: e.target.value })
                    }
                    className="bg-background border-primary/30 focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="number_of_employees" className="text-foreground">
                    Number of Employees
                  </Label>
                  <Input
                    id="number_of_employees"
                    type="text"
                    placeholder="e.g., 10-50"
                    value={formData.number_of_employees}
                    onChange={(e) =>
                      setFormData({ ...formData, number_of_employees: e.target.value })
                    }
                    className="bg-background border-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricing_model" className="text-foreground">
                  Pricing Model
                </Label>
                <Input
                  id="pricing_model"
                  type="text"
                  placeholder="e.g., Subscription, One-time, Freemium"
                  value={formData.pricing_model}
                  onChange={(e) =>
                    setFormData({ ...formData, pricing_model: e.target.value })
                  }
                  className="bg-background border-primary/30 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_customers" className="text-foreground">
                  Who Are Your Customers?
                </Label>
                <Textarea
                  id="target_customers"
                  placeholder="Describe your target customers and customer segments..."
                  value={formData.target_customers}
                  onChange={(e) =>
                    setFormData({ ...formData, target_customers: e.target.value })
                  }
                  className="bg-background border-primary/30 focus:border-primary min-h-[80px]"
                />
              </div>

              {/* Products Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground text-lg">
                    Products & Services *
                  </Label>
                  <Button
                    type="button"
                    onClick={addProduct}
                    variant="outline"
                    size="sm"
                    className="border-primary/30 hover:bg-primary/10"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Product
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.types_of_products.map((product, index) => (
                    <Card key={index} className="p-4 bg-background/50 border-primary/20">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-foreground">
                            Product {index + 1}
                          </h4>
                          {formData.types_of_products.length > 1 && (
                            <Button
                              type="button"
                              onClick={() => removeProduct(index)}
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Product Name *
                            </Label>
                            <Input
                              type="text"
                              placeholder="e.g., AI Analytics Platform"
                              value={product.product_name}
                              onChange={(e) =>
                                updateProduct(index, 'product_name', e.target.value)
                              }
                              required
                              className="bg-background border-primary/30 focus:border-primary"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Product URL
                            </Label>
                            <Input
                              type="url"
                              placeholder="https://product-page.com"
                              value={product.product_url}
                              onChange={(e) =>
                                updateProduct(index, 'product_url', e.target.value)
                              }
                              className="bg-background border-primary/30 focus:border-primary"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Product Description *
                          </Label>
                          <Textarea
                            placeholder="Describe this product or service..."
                            value={product.product_description}
                            onChange={(e) =>
                              updateProduct(index, 'product_description', e.target.value)
                            }
                            required
                            className="bg-background border-primary/30 focus:border-primary min-h-[60px]"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving changes...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="border-primary/30 hover:bg-primary/10"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
