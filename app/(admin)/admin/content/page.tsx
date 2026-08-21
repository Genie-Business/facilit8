import type { Metadata } from "next";

import { listAllFaqs } from "@/lib/services/faq.service";
import { getLegalPage } from "@/lib/services/legal-page.service";
import { getSiteSettings } from "@/lib/services/site-settings.service";
import { getMarketingPageContent } from "@/lib/services/marketing-content.service";
import { deleteFaqAction } from "@/lib/actions/admin-content.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FaqForm } from "@/components/admin/faq-form";
import { LegalPageForm } from "@/components/admin/legal-page-form";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { HomeContentForm } from "@/components/admin/marketing-content/home-content-form";
import { AboutContentForm } from "@/components/admin/marketing-content/about-content-form";
import { ServicesContentForm } from "@/components/admin/marketing-content/services-content-form";
import { CareersContentForm } from "@/components/admin/marketing-content/careers-content-form";

export const metadata: Metadata = {
  title: "Content",
  robots: { index: false, follow: false },
};

export default async function AdminContentPage() {
  const [faqs, privacyPage, termsPage, siteSettings, homeContent, aboutContent, servicesContent, careersContent] =
    await Promise.all([
      listAllFaqs(),
      getLegalPage("privacy"),
      getLegalPage("terms"),
      getSiteSettings(),
      getMarketingPageContent("home"),
      getMarketingPageContent("about"),
      getMarketingPageContent("services"),
      getMarketingPageContent("careers"),
    ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Content</h1>
        <p className="text-muted-foreground">Manage every landing page, the FAQ, legal pages, and contact info.</p>
      </div>

      <Tabs defaultValue="faq">
        <TabsList>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="home">Home</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="careers">Careers</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
          <TabsTrigger value="site-info">Site Info</TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add a question</CardTitle>
            </CardHeader>
            <CardContent>
              <FaqForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">All questions</CardTitle>
              <CardDescription>{faqs.length} total</CardDescription>
            </CardHeader>
            <CardContent>
              {faqs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No FAQs yet. Add one above.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faqs.map((faq) => (
                      <TableRow key={faq.id}>
                        <TableCell className="font-medium">{faq.question}</TableCell>
                        <TableCell className="text-right">
                          <form
                            action={async () => {
                              "use server";
                              await deleteFaqAction(faq.id);
                            }}
                          >
                            <Button type="submit" size="sm" variant="destructive">
                              Delete
                            </Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="home" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Homepage</CardTitle>
            </CardHeader>
            <CardContent>
              <HomeContentForm initial={homeContent} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About page</CardTitle>
            </CardHeader>
            <CardContent>
              <AboutContentForm initial={aboutContent} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Services page</CardTitle>
            </CardHeader>
            <CardContent>
              <ServicesContentForm initial={servicesContent} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="careers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Careers page</CardTitle>
            </CardHeader>
            <CardContent>
              <CareersContentForm initial={careersContent} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <LegalPageForm
                slug="privacy"
                title={privacyPage?.title ?? "Privacy Policy"}
                contentHtml={privacyPage?.contentHtml ?? ""}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Terms of Service</CardTitle>
            </CardHeader>
            <CardContent>
              <LegalPageForm
                slug="terms"
                title={termsPage?.title ?? "Terms of Service"}
                contentHtml={termsPage?.contentHtml ?? ""}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="site-info" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact info</CardTitle>
              <CardDescription>Shown on the /contact page.</CardDescription>
            </CardHeader>
            <CardContent>
              <SiteSettingsForm email={siteSettings.email} phone={siteSettings.phone} address={siteSettings.address} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
