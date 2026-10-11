# Checkout Lab Online 3.0 — backend setup

This branch contains the first online-platform foundation. It is intentionally not linked from production yet.

## 1. Create Supabase project
Create a project, then open SQL Editor and run `supabase/schema.sql` once.

## 2. Browser key
Open the project's Connect dialog and copy:
- Project URL
- Publishable key beginning with `sb_publishable_`

Put them into `supabase-config.js`. A publishable key is expected to be visible in browser source; security comes from Auth + RLS.

**Never** put a Secret key (`sb_secret_`) or legacy service-role key into this repository or browser code.

## 3. Auth
For the first test enable Email/Password. Add production redirect URLs for:
- https://checkoutlab.ru/
- https://checkoutlab.ru/online.html
- https://checkoutlab.ru/en/online.html

## 4. Two-device acceptance test
1. Create two users.
2. User A creates a private 501 Double Out room.
3. User B joins with the six-character room code.
4. Submit visits alternately and verify both screens update.
5. Verify an out-of-turn RPC call is rejected.
6. Verify a third signed-in user cannot read a private match.
7. Verify duplicate client_event_id does not duplicate a visit.
8. Verify BUST keeps the previous remaining score.
9. Verify a checkout increments the leg and resets both players.
10. Verify the final leg finishes the match and records winner_id.

## Architecture
- Existing local scorer remains offline-first and independent.
- Supabase Auth: accounts/session.
- Postgres + RLS: profiles, friends, matches, visits, invitations.
- RPC: authoritative room creation/join/scoring.
- Realtime: early-stage DB synchronization.
- Presence: online/active state only.
- Later scale step: move match change fan-out from Postgres Changes to private Broadcast channels.

## Security rules
Client code never gets direct write grants to matches, match_players or visits. Match mutations happen through narrowly granted RPC functions that verify auth.uid(), membership and turn ownership.
