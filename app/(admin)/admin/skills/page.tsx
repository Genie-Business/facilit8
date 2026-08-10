import type { Metadata } from "next";

import { listAllSkills } from "@/lib/services/skill.service";
import { toggleSkillActiveAction, deleteSkillAction } from "@/lib/actions/admin-skill.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SkillForm } from "@/components/admin/skill-form";

export const metadata: Metadata = {
  title: "Skills",
  robots: { index: false, follow: false },
};

export default async function AdminSkillsPage() {
  const skills = await listAllSkills();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Skills</h1>
        <p className="text-muted-foreground">
          Manage the skills Facilitators can select on their profile (e.g. Emotional Intelligence, Sales).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a skill</CardTitle>
        </CardHeader>
        <CardContent>
          <SkillForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All skills</CardTitle>
          <CardDescription>{skills.length} total</CardDescription>
        </CardHeader>
        <CardContent>
          {skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">No skills yet. Add one above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skills.map((skill) => (
                  <TableRow key={skill.id}>
                    <TableCell className="font-medium">{skill.name}</TableCell>
                    <TableCell>
                      <Badge variant={skill.isActive ? "secondary" : "outline"}>
                        {skill.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <form
                          action={async () => {
                            "use server";
                            await toggleSkillActiveAction(skill.id, !skill.isActive);
                          }}
                        >
                          <Button type="submit" size="sm" variant="outline">
                            {skill.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </form>
                        <form
                          action={async () => {
                            "use server";
                            await deleteSkillAction(skill.id);
                          }}
                        >
                          <Button type="submit" size="sm" variant="destructive">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
