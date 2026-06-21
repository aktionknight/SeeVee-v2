import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Briefcase, Building2, MapPin } from "lucide-react"

export default function DiscoverPage() {
  const MOCK_JOBS = [
    { id: 1, title: "Frontend Engineer", company: "TechCorp", location: "Remote", type: "Full-time" },
    { id: 2, title: "Full Stack Developer", company: "StartupX", location: "New York, NY", type: "Contract" },
    { id: 3, title: "React Specialist", company: "AgencyY", location: "San Francisco, CA", type: "Full-time" },
  ]

  return (
    <div className="flex min-h-screen flex-col p-8 md:p-24 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Discover Leads & Jobs</h1>
        <p className="text-muted-foreground">Find the best opportunities using Apify web scraping.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="grid gap-2 flex-1">
              <Label htmlFor="search">Keywords</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="search" placeholder="e.g. Frontend React Developer" className="pl-9" />
              </div>
            </div>
            <div className="grid gap-2 flex-1">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="location" placeholder="e.g. Remote, New York" className="pl-9" />
              </div>
            </div>
            <Button className="w-full md:w-auto">Search</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {MOCK_JOBS.map((job) => (
          <Card key={job.id} className="hover:bg-muted/50 transition-colors">
            <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">{job.title}</h3>
                <div className="flex items-center text-sm text-muted-foreground gap-4">
                  <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {job.company}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                  <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {job.type}</span>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="secondary" className="flex-1 md:flex-none">Save Lead</Button>
                <Button className="flex-1 md:flex-none">Generate Outreach</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
