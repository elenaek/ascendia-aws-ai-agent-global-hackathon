'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Loader2, Save, ChevronDown, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useAnalyticsStore } from '@/stores/analytics-store'
import { Header } from '@/components/dashboard/header'
import { toast } from 'sonner'

const TARGET_CHANNEL_OPTIONS = [
  'Company Website or Online Store',
  'Retail Stores or Physical Locations',
  'Distributor or Reseller Networks',
  'Sales Representatives or Account Managers',
  'Marketplaces',
  'Partner Integrations or APIs',
  'Social Media or Content Marketing',
  'Trade Shows or Events'
] as const

export default function ProfilePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const { setCompany } = useAnalyticsStore()

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
      product_description: '',
      pricing: '',
      pricing_model: '',
      distribution_model: '',
      distribution_model_justification: '',
      target_channels: [],
      target_audience_description: '',
      target_sectors: [],
      typical_segment_size: '',
      key_decision_makers: []
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
          types_of_products: (companyData.types_of_products || []).map((product: {
            product_name?: string;
            product_url?: string;
            product_description?: string;
            pricing?: string;
            pricing_model?: string;
            distribution_model?: string;
            distribution_model_justification?: string;
            target_channels?: string[];
            target_audience_description?: string;
            target_sectors?: string[];
            typical_segment_size?: string;
            key_decision_makers?: string[];
          }) => ({
            product_name: product.product_name || '',
            product_url: product.product_url || '',
            product_description: product.product_description || '',
            pricing: product.pricing || '',
            pricing_model: product.pricing_model || '',
            distribution_model: product.distribution_model || '',
            distribution_model_justification: product.distribution_model_justification || '',
            target_channels: product.target_channels || [],
            target_audience_description: product.target_audience_description || '',
            target_sectors: product.target_sectors || [],
            typical_segment_size: product.typical_segment_size || '',
            key_decision_makers: product.key_decision_makers || []
          }))
        })

        if (companyData.types_of_products?.length === 0) {
          setFormData(prev => ({
            ...prev,
            types_of_products: [{
              product_name: '',
              product_url: '',
              product_description: '',
              pricing: '',
              pricing_model: '',
              distribution_model: '',
              distribution_model_justification: '',
              target_channels: [],
              target_audience_description: '',
              target_sectors: [],
              typical_segment_size: '',
              key_decision_makers: []
            }]
          }))
        }

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
          product_description: '',
          pricing: '',
          pricing_model: '',
          distribution_model: '',
          distribution_model_justification: '',
          target_channels: [],
          target_audience_description: '',
          target_sectors: [],
          typical_segment_size: '',
          key_decision_makers: []
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

  const updateProduct = (index: number, field: string, value: string | string[]) => {
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
      } as Parameters<typeof setCompany>[0]
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

                        {/* Pricing Information */}
                        <div className="pt-4 border-t border-primary/10">
                          <Label className="text-sm font-medium text-foreground mb-3 block">
                            Pricing Information (Optional)
                          </Label>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">
                                Pricing
                              </Label>
                              <Input
                                type="text"
                                placeholder="e.g., $99/month, Free"
                                value={product.pricing || ''}
                                onChange={(e) =>
                                  updateProduct(index, 'pricing', e.target.value)
                                }
                                className="bg-background border-primary/30 focus:border-primary"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">
                                Pricing Model
                              </Label>
                              <Input
                                type="text"
                                placeholder="e.g., Subscription, Freemium"
                                value={product.pricing_model || ''}
                                onChange={(e) =>
                                  updateProduct(index, 'pricing_model', e.target.value)
                                }
                                className="bg-background border-primary/30 focus:border-primary"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Distribution Channel */}
                        <div className="pt-4 border-t border-primary/10">
                          <Label className="text-sm font-medium text-foreground mb-3 block">
                            Distribution Channel (Optional)
                          </Label>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">
                                Distribution Model
                              </Label>
                              <Select
                                value={product.distribution_model || ''}
                                onValueChange={(value) =>
                                  updateProduct(index, 'distribution_model', value)
                                }
                              >
                                <SelectTrigger className="bg-background border-primary/30 focus:border-primary">
                                  <SelectValue placeholder="Select distribution model" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Direct to Customer">Direct to Customer</SelectItem>
                                  <SelectItem value="Business to Business">Business to Business</SelectItem>
                                  <SelectItem value="Business to Consumer">Business to Consumer</SelectItem>
                                  <SelectItem value="Retail or Wholesale Partners">Retail or Wholesale Partners</SelectItem>
                                  <SelectItem value="Other or Hybrid Models">Other or Hybrid Models</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">
                                Distribution Model Justification
                              </Label>
                              <Textarea
                                placeholder="Why did you choose this distribution model?"
                                value={product.distribution_model_justification || ''}
                                onChange={(e) =>
                                  updateProduct(index, 'distribution_model_justification', e.target.value)
                                }
                                className="bg-background border-primary/30 focus:border-primary min-h-[60px]"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">
                                Target Channels
                              </Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-between bg-background border-primary/30 hover:bg-primary/5"
                                  >
                                    <span className="text-sm">
                                      {product.target_channels && product.target_channels.length > 0
                                        ? `${product.target_channels.length} selected`
                                        : 'Select channels'}
                                    </span>
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start">
                                  <div className="max-h-[300px] overflow-y-auto p-4 space-y-2">
                                    {TARGET_CHANNEL_OPTIONS.map((channel) => {
                                      const isChecked = (product.target_channels as string[] | undefined)?.includes(channel) || false
                                      return (
                                        <div key={channel} className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`channel-${index}-${channel}`}
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                              const currentChannels = product.target_channels || []
                                              const newChannels = checked
                                                ? [...currentChannels, channel]
                                                : currentChannels.filter(c => c !== channel)
                                              updateProduct(index, 'target_channels', newChannels)
                                            }}
                                          />
                                          <label
                                            htmlFor={`channel-${index}-${channel}`}
                                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                          >
                                            {channel}
                                          </label>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </PopoverContent>
                              </Popover>
                              {product.target_channels && product.target_channels.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {product.target_channels.map((channel) => (
                                    <Badge
                                      key={channel}
                                      variant="outline"
                                      className="text-xs px-2 py-0.5 border-primary/30"
                                    >
                                      {channel}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newChannels = product.target_channels?.filter(c => c !== channel) || []
                                          updateProduct(index, 'target_channels', newChannels)
                                        }}
                                        className="ml-1 hover:text-destructive"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Target Audience */}
                        <div className="pt-4 border-t border-primary/10">
                          <Label className="text-sm font-medium text-foreground mb-3 block">
                            Target Audience (Optional)
                          </Label>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">
                                Target Audience Description
                              </Label>
                              <Textarea
                                placeholder="Who are your target users for this product?"
                                value={product.target_audience_description || ''}
                                onChange={(e) =>
                                  updateProduct(index, 'target_audience_description', e.target.value)
                                }
                                className="bg-background border-primary/30 focus:border-primary min-h-[60px]"
                              />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">
                                  Target Sectors (comma-separated)
                                </Label>
                                <Input
                                  type="text"
                                  placeholder="e.g., Healthcare, Finance, Tech"
                                  value={Array.isArray(product.target_sectors) ? product.target_sectors.join(', ') : ''}
                                  onChange={(e) =>
                                    updateProduct(index, 'target_sectors', e.target.value.split(',').map(s => s.trim()).filter(Boolean))
                                  }
                                  className="bg-background border-primary/30 focus:border-primary"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">
                                  Typical Segment Size
                                </Label>
                                <Select
                                  value={product.typical_segment_size || ''}
                                  onValueChange={(value) =>
                                    updateProduct(index, 'typical_segment_size', value)
                                  }
                                >
                                  <SelectTrigger className="bg-background border-primary/30 focus:border-primary">
                                    <SelectValue placeholder="Select segment size" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="SMB">SMB (Small/Medium Business)</SelectItem>
                                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                                    <SelectItem value="Startups">Startups</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">
                                Key Decision Makers (comma-separated)
                              </Label>
                              <Input
                                type="text"
                                placeholder="e.g., CTOs, IT Managers, Procurement Teams"
                                value={Array.isArray(product.key_decision_makers) ? product.key_decision_makers.join(', ') : ''}
                                onChange={(e) =>
                                  updateProduct(index, 'key_decision_makers', e.target.value.split(',').map(s => s.trim()).filter(Boolean))
                                }
                                className="bg-background border-primary/30 focus:border-primary"
                              />
                            </div>
                          </div>
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
