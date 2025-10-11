'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Building2, MapPin, Users, DollarSign, Target, AlertCircle, Truck, ThumbsUp, ThumbsDown, UserCheck, TrendingUp, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompetitorPricing {
  pricing: string
  pricing_model: string
}

interface DistributionChannel {
  distribution_model: 'Direct to Customer' | 'Business to Business' | 'Business to Consumer' | 'Retail or Wholesale Partners' | 'Other or Hybrid Models'
  distribution_model_justification: string
  target_channels: Array<
    | 'Company Website or Online Store'
    | 'Retail Stores or Physical Locations'
    | 'Distributor or Reseller Networks'
    | 'Sales Representatives or Account Managers'
    | 'Marketplaces'
    | 'Partner Integrations or APIs'
    | 'Social Media or Content Marketing'
    | 'Trade Shows or Events'
  >
}

interface TargetAudience {
  target_audience_description: string
  target_sectors: string[]
  typical_segment_size: 'SMB' | 'Enterprise' | 'Startups'
  key_decision_makers: string[]
}

interface CompetitorProductCustomerSentiment {
  key_themes: string[]
  overall_sentiment: string
  strengths: string[]
  weaknesses: string[]
}

interface Product {
  product_name: string
  product_url?: string
  product_description?: string
  // Extended CompetitorAnalysis fields
  pricing?: CompetitorPricing[]
  distribution_channel?: DistributionChannel
  target_audience?: TargetAudience
  customer_sentiment?: CompetitorProductCustomerSentiment
}

interface CompanyData {
  // Core fields
  id?: string
  company_name: string
  company_url?: string
  company_description?: string
  unique_value_proposition?: string

  // Extended competitor fields
  website_url?: string
  company_headquarters_location?: string
  number_of_employees?: number | string
  founding_or_established_date?: string
  mission_statement?: string
  vision_statement?: string
  company_culture_and_values?: string
  additional_office_locations?: string[]

  // Business info
  revenue?: string
  stage_of_company?: string
  pricing_model?: string
  target_customers?: string

  // Products
  types_of_products?: Product[]
  products?: Product[]

  // Category (for competitors)
  category?: 'Direct Competitors' | 'Indirect Competitors' | 'Potential Competitors'

  // Additional metadata
  notes?: string
  sources?: string[]
}

interface DetailedCompanyCardProps {
  data: CompanyData
  isUserCompany?: boolean
  className?: string
}

export function DetailedCompanyCard({ data, isUserCompany = false, className }: DetailedCompanyCardProps) {
  const products = data.types_of_products || data.products || []
  const website = data.company_url || data.website_url || ''
  const description = data.company_description || data.unique_value_proposition || ''

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'Direct Competitors':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'Indirect Competitors':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'Potential Competitors':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-green-500/20 text-green-400 border-green-500/30'
    }
  }

  return (
    <Card className={cn(
      "bg-gradient-to-br from-purple-500/10 via-background to-blue-500/10 border-primary/30 overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-primary/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground mb-0.5">
                {data.company_name}
              </h2>
              {website && (
                <a
                  href={website.startsWith('http') ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
                >
                  {website}
                </a>
              )}
            </div>
          </div>
          <Badge
            className={cn(
              "flex-shrink-0 text-[10px] px-2 py-0.5",
              isUserCompany ? 'bg-green-500/20 text-green-400 border-green-500/30' : getCategoryColor(data.category)
            )}
            variant="outline"
          >
            {isUserCompany ? 'Your Company' : data.category || 'Competitor'}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Company Overview */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Company Overview
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {data.founding_or_established_date && (
              <div>
                <p className="text-xs text-muted-foreground">Founded</p>
                <p className="text-sm font-medium text-foreground">{data.founding_or_established_date}</p>
              </div>
            )}
            {(data.number_of_employees || data.number_of_employees === 0) && (
              <div>
                <p className="text-xs text-muted-foreground">Employees</p>
                <p className="text-sm font-medium text-foreground">
                  {typeof data.number_of_employees === 'number'
                    ? data.number_of_employees.toLocaleString() + '+'
                    : data.number_of_employees}
                </p>
              </div>
            )}
            {data.revenue && (
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-sm font-medium text-foreground">{data.revenue}</p>
              </div>
            )}
            {data.stage_of_company && (
              <div>
                <p className="text-xs text-muted-foreground">Stage</p>
                <p className="text-sm font-medium text-foreground">{data.stage_of_company}</p>
              </div>
            )}
          </div>
        </div>

        {/* Headquarters */}
        {data.company_headquarters_location && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Headquarters
            </h3>
            <p className="text-sm text-foreground">{data.company_headquarters_location}</p>
            {data.additional_office_locations && data.additional_office_locations.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Additional Offices</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.additional_office_locations.map((location, index) => (
                    <Badge key={index} variant="outline" className="border-primary/30 text-foreground text-[10px] px-2 py-0.5">
                      {location}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Company Description */}
        {description && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          </div>
        )}

        {/* Mission & Vision */}
        {(data.mission_statement || data.vision_statement) && (
          <div className="space-y-2">
            {data.mission_statement && (
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-1">Mission</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{data.mission_statement}</p>
              </div>
            )}
            {data.vision_statement && (
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-1">Vision</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{data.vision_statement}</p>
              </div>
            )}
          </div>
        )}

        {/* Products */}
        {products.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Products ({products.length})
            </h3>
            <Accordion type="single" collapsible className="space-y-2">
              {products.map((product, index) => (
                <AccordionItem
                  key={index}
                  value={`product-${index}`}
                  className="border border-primary/10 rounded-lg overflow-hidden bg-background/50"
                >
                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-primary/5 transition-colors">
                    <div className="flex items-center gap-2 text-left">
                      <Package className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-xs font-semibold text-foreground">{product.product_name}</span>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-3 pb-3 space-y-3">
                    {/* Product Description */}
                    {product.product_description && (
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{product.product_description}</p>
                      </div>
                    )}

                    {/* Product URL */}
                    {product.product_url && (
                      <div>
                        <a
                          href={product.product_url.startsWith('http') ? product.product_url : `https://${product.product_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-primary hover:text-primary/80 underline underline-offset-2"
                        >
                          Visit Product →
                        </a>
                      </div>
                    )}

                    {/* Pricing Information */}
                    {product.pricing && product.pricing.length > 0 && (
                      <div className="pt-2 border-t border-primary/10">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <DollarSign className="w-3 h-3 text-green-400" />
                          <h5 className="text-[10px] font-semibold text-foreground">Pricing</h5>
                        </div>
                        {product.pricing.map((priceInfo, pidx) => (
                          <div key={pidx} className="space-y-1">
                            <p className="text-[10px] text-muted-foreground">{priceInfo.pricing}</p>
                            <p className="text-[10px] text-muted-foreground italic">{priceInfo.pricing_model}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Distribution Channel */}
                    {product.distribution_channel && (
                      <div className="pt-2 border-t border-primary/10">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Truck className="w-3 h-3 text-blue-400" />
                          <h5 className="text-[10px] font-semibold text-foreground">Distribution</h5>
                        </div>
                        <div className="space-y-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-400 border-blue-500/20">
                            {product.distribution_channel.distribution_model}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground">{product.distribution_channel.distribution_model_justification}</p>
                          {product.distribution_channel.target_channels && product.distribution_channel.target_channels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {product.distribution_channel.target_channels.map((channel, cidx) => (
                                <Badge key={cidx} variant="outline" className="text-[9px] px-1 py-0">
                                  {channel}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Target Audience */}
                    {product.target_audience && (
                      <div className="pt-2 border-t border-primary/10">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <UserCheck className="w-3 h-3 text-purple-400" />
                          <h5 className="text-[10px] font-semibold text-foreground">Target Audience</h5>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-muted-foreground">{product.target_audience.target_audience_description}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-muted-foreground">Segment:</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-purple-500/10 text-purple-400 border-purple-500/20">
                              {product.target_audience.typical_segment_size}
                            </Badge>
                          </div>
                          {product.target_audience.target_sectors && product.target_audience.target_sectors.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[9px] text-muted-foreground">Sectors:</span>
                              <div className="flex flex-wrap gap-1">
                                {product.target_audience.target_sectors.map((sector, sidx) => (
                                  <Badge key={sidx} variant="outline" className="text-[9px] px-1 py-0">
                                    {sector}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {product.target_audience.key_decision_makers && product.target_audience.key_decision_makers.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[9px] text-muted-foreground">Decision Makers:</span>
                              <div className="flex flex-wrap gap-1">
                                {product.target_audience.key_decision_makers.map((dm, didx) => (
                                  <Badge key={didx} variant="outline" className="text-[9px] px-1 py-0">
                                    {dm}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Customer Sentiment */}
                    {product.customer_sentiment && (
                      <div className="pt-2 border-t border-primary/10">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <TrendingUp className="w-3 h-3 text-amber-400" />
                          <h5 className="text-[10px] font-semibold text-foreground">Customer Sentiment</h5>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] text-muted-foreground italic">{product.customer_sentiment.overall_sentiment}</p>

                          {product.customer_sentiment.key_themes && product.customer_sentiment.key_themes.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[9px] text-muted-foreground">Key Themes:</span>
                              <div className="flex flex-wrap gap-1">
                                {product.customer_sentiment.key_themes.map((theme, tidx) => (
                                  <Badge key={tidx} variant="outline" className="text-[9px] px-1 py-0">
                                    {theme}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {product.customer_sentiment.strengths && product.customer_sentiment.strengths.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <ThumbsUp className="w-2.5 h-2.5 text-green-400" />
                                <span className="text-[9px] text-muted-foreground font-medium">Strengths:</span>
                              </div>
                              <ul className="list-disc list-inside space-y-0.5 ml-1">
                                {product.customer_sentiment.strengths.map((strength, sidx) => (
                                  <li key={sidx} className="text-[10px] text-muted-foreground">{strength}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {product.customer_sentiment.weaknesses && product.customer_sentiment.weaknesses.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <ThumbsDown className="w-2.5 h-2.5 text-red-400" />
                                <span className="text-[9px] text-muted-foreground font-medium">Weaknesses:</span>
                              </div>
                              <ul className="list-disc list-inside space-y-0.5 ml-1">
                                {product.customer_sentiment.weaknesses.map((weakness, widx) => (
                                  <li key={widx} className="text-[10px] text-muted-foreground">{weakness}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        {/* Pricing Strategy */}
        {data.pricing_model && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Pricing
            </h3>
            <p className="text-xs text-muted-foreground">{data.pricing_model}</p>
          </div>
        )}

        {/* Marketing Strategy */}
        {data.target_customers && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Target Customers
            </h3>
            <p className="text-xs text-muted-foreground">{data.target_customers}</p>
          </div>
        )}

        {/* Company Culture */}
        {data.company_culture_and_values && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Culture & Values
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{data.company_culture_and_values}</p>
          </div>
        )}

        {/* Notes */}
        {data.notes && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              Notes
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{data.notes}</p>
          </div>
        )}

        {/* Sources */}
        {data.sources && data.sources.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1.5">Sources</h4>
            <div className="flex flex-wrap gap-1.5">
              {data.sources.map((source, index) => (
                <a
                  key={index}
                  href={source.startsWith('http') ? source : `https://${source}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-primary hover:text-primary/80 underline underline-offset-2"
                >
                  Source {index + 1}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer indicator */}
      <div className="h-1 bg-gradient-to-r from-purple-500 via-primary to-blue-500" />
    </Card>
  )
}
