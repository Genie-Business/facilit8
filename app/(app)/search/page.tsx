import Link from "next/link";
import { Star } from "lucide-react";

import { prisma } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  const [events, facilitators] = query
    ? await Promise.all([
        prisma.trainingEvent.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { location: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 20,
        }),
        prisma.user.findMany({
          where: {
            role: "FACILITATOR",
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { organization: { contains: query, mode: "insensitive" } },
              { specialization: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 20,
        }),
      ])
    : [[], []];

  const ratings = facilitators.length
    ? await prisma.review.groupBy({
        by: ["revieweeId"],
        where: { revieweeId: { in: facilitators.map((f) => f.id) } },
        _avg: { rating: true },
        _count: { rating: true },
      })
    : [];
  const ratingByUserId = new Map(ratings.map((r) => [r.revieweeId, r]));

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Search</h1>

      <form className="flex gap-2">
        <Input name="q" defaultValue={query} placeholder="Search events or facilitators..." />
        <Button type="submit">Search</Button>
      </form>

      {query && events.length === 0 && facilitators.length === 0 && (
        <p className="text-muted-foreground">No results for &quot;{query}&quot;.</p>
      )}

      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.map((event) => (
              <Link key={event.id} href={`/events/${event.slug}`} className="block text-sm hover:underline">
                {event.title} · {event.location}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {facilitators.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Facilitators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {facilitators.map((facilitator) => {
              const rating = ratingByUserId.get(facilitator.id);
              return (
                <Link
                  key={facilitator.id}
                  href={`/facilitators/${facilitator.slug}`}
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <span>
                    {facilitator.firstName} {facilitator.lastName}
                    {facilitator.specialization ? ` · ${facilitator.specialization}` : ""}
                  </span>
                  {rating && rating._count.rating > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                      {rating._avg.rating?.toFixed(1)}
                    </span>
                  )}
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
