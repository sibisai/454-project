#!/usr/bin/env python3
"""
Seed script for Soundboard demo data.
Run with: python3 seed_data.py
Requires: pip install httpx
Assumes backend is running at http://localhost:8000
"""

import httpx
import time
import sys

BASE = "http://localhost:8000/api"
CLIENT = httpx.Client(base_url=BASE, timeout=30.0)


def register(email, password, display_name):
    r = CLIENT.post("/auth/register", json={
        "email": email,
        "password": password,
        "display_name": display_name,
    })
    if r.status_code == 409:
        print(f"  Already exists: {display_name}")
        return login(email, password)
    r.raise_for_status()
    data = r.json()
    token = login(email, password)
    return token


def login(email, password):
    r = CLIENT.post("/auth/login", json={"email": email, "password": password})
    r.raise_for_status()
    return r.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def post_track(token, url):
    r = CLIENT.post("/tracks", json={"soundcloud_url": url}, headers=auth(token))
    if r.status_code == 409:
        print(f"  Track already posted: {url.split('/')[-1]}")
        # Find existing track
        tracks = CLIENT.get("/tracks?per_page=100", headers=auth(token)).json()["tracks"]
        for t in tracks:
            if url in t["soundcloud_url"]:
                return t["id"]
        return None
    r.raise_for_status()
    data = r.json()
    print(f"  Track added: {data.get('title', url.split('/')[-1])}")
    return data["id"]


def post_comment(token, track_id, content):
    r = CLIENT.post(f"/tracks/{track_id}/posts", json={"content": content}, headers=auth(token))
    r.raise_for_status()
    return r.json()["id"]


def reply(token, post_id, content):
    r = CLIENT.post(f"/posts/{post_id}/replies", json={"content": content}, headers=auth(token))
    r.raise_for_status()
    return r.json()["id"]


def vote(token, post_id, value):
    r = CLIENT.post(f"/posts/{post_id}/vote", json={"value": value}, headers=auth(token))
    if r.status_code == 400:
        return  # can't vote on own post
    r.raise_for_status()


def like_track(token, track_id):
    r = CLIENT.post(f"/tracks/{track_id}/like", headers=auth(token))
    r.raise_for_status()


def pin_post(token, track_id, post_id):
    r = CLIENT.post(f"/tracks/{track_id}/pin/{post_id}", headers=auth(token))
    r.raise_for_status()


def delegate_mod(token, track_id, user_id):
    r = CLIENT.post(f"/tracks/{track_id}/moderators/{user_id}", headers=auth(token))
    if r.status_code in (400, 409):
        print(f"  Mod delegation skipped (already exists or conflict)")
        return
    r.raise_for_status()


def set_role(admin_token, user_id, role):
    r = CLIENT.put(f"/admin/users/{user_id}/role", json={"role": role}, headers=auth(admin_token))
    if r.status_code == 400:
        print(f"  Role change skipped")
        return
    r.raise_for_status()


def ban_user(admin_token, user_id):
    r = CLIENT.post(f"/admin/users/{user_id}/ban", headers=auth(admin_token))
    if r.status_code == 400:
        return
    r.raise_for_status()


def get_user_id(token):
    r = CLIENT.get("/auth/me", headers=auth(token))
    r.raise_for_status()
    return r.json()["id"]


def remove_post(token, post_id):
    r = CLIENT.delete(f"/posts/{post_id}", headers=auth(token))
    r.raise_for_status()


# ============================================================
# USERS
# ============================================================
print("\n=== Creating Users ===")

PASSWORD = "Demo1234!"

users = {
    "admin":    {"email": "admin@soundboard.io",    "display": "SoundboardAdmin"},
    "marcus":   {"email": "marcus@gmail.com",       "display": "marcusbeats"},
    "sarah":    {"email": "sarah@outlook.com",      "display": "sarahlistens"},
    "jay":      {"email": "jay@proton.me",          "display": "jayvibes"},
    "kira":     {"email": "kira@icloud.com",        "display": "kirasound"},
    "devon":    {"email": "devon@yahoo.com",        "display": "devonmixes"},
    "luna":     {"email": "luna@gmail.com",          "display": "lunaecho"},
    "alex":     {"email": "alex@hotmail.com",        "display": "alexgrooves"},
    "nadia":    {"email": "nadia@gmail.com",         "display": "nadiawaves"},
    "tyler":    {"email": "tyler@outlook.com",       "display": "tylerspins"},
    "banned":   {"email": "spammer@temp.com",        "display": "xXspam_botXx"},
}

tokens = {}
user_ids = {}

for key, u in users.items():
    token = register(u["email"], PASSWORD, u["display"])
    tokens[key] = token
    user_ids[key] = get_user_id(token)
    print(f"  {u['display']} registered (id: {user_ids[key][:8]}...)")

# Set admin role directly in DB then re-login to get admin-scoped JWT
print("\n=== Setting Roles ===")
import subprocess
subprocess.run([
    "docker", "exec", "454-project-db-1",
    "psql", "-U", "devuser", "-d", "soundcloud_discuss",
    "-c", "UPDATE users SET global_role = 'admin' WHERE email = 'admin@soundboard.io';"
], check=True, capture_output=True)
tokens["admin"] = login("admin@soundboard.io", PASSWORD)
print("  SoundboardAdmin -> admin")

# Ban the spammer
ban_user(tokens["admin"], user_ids["banned"])
print("  xXspam_botXx -> banned")


# ============================================================
# TRACKS (SoundCloud URLs for top streamed songs)
# ============================================================
print("\n=== Adding Tracks ===")

# Real SoundCloud URLs for popular tracks
track_urls = {
    "blinding":   ("marcus",  "https://soundcloud.com/theweeknd/blinding-lights"),
    "shape":      ("sarah",   "https://soundcloud.com/edsheeran/shape-of-you"),
    "sweater":    ("jay",     "https://soundcloud.com/majorlazer/lean-on-feat-mo-dj-snake"),
    "starboy":    ("marcus",  "https://soundcloud.com/theweeknd/starboy"),
    "as_it_was":  ("kira",    "https://soundcloud.com/harrystyles/as-it-was"),
    "someone":    ("luna",    "https://soundcloud.com/dualipa/levitating"),
    "sunflower":  ("devon",   "https://soundcloud.com/postmalone/circles"),
    "one_dance":  ("alex",    "https://soundcloud.com/octobersveryown/drake-one-dance"),
    "believer":   ("nadia",   "https://soundcloud.com/imaginedragons/believer"),
    "heat_waves": ("tyler",   "https://soundcloud.com/glassanimals/heat-waves"),
    "lovely":     ("luna",    "https://soundcloud.com/billieeilish/lovely"),
    "yellow":     ("jay",     "https://soundcloud.com/coldplay/yellow"),
    "closer":     ("devon",   "https://soundcloud.com/thechainsmokers/closer"),
    "riptide":    ("sarah",   "https://soundcloud.com/billieeilish/bad-guy"),
    "take_me":    ("kira",    "https://soundcloud.com/marshmellomusic/happier"),
}

track_ids = {}
for key, (poster, url) in track_urls.items():
    tid = post_track(tokens[poster], url)
    if tid:
        track_ids[key] = tid
    time.sleep(0.3)  # don't hammer oEmbed API


# ============================================================
# LIKES
# ============================================================
print("\n=== Liking Tracks ===")

likes = [
    # Blinding Lights - most liked
    ("sarah", "blinding"), ("jay", "blinding"), ("kira", "blinding"),
    ("luna", "blinding"), ("devon", "blinding"), ("alex", "blinding"),
    ("nadia", "blinding"), ("tyler", "blinding"),
    # Shape of You
    ("marcus", "shape"), ("jay", "shape"), ("kira", "shape"),
    ("luna", "shape"), ("devon", "shape"), ("alex", "shape"),
    # Sweater Weather
    ("marcus", "sweater"), ("sarah", "sweater"), ("kira", "sweater"),
    ("luna", "sweater"), ("devon", "sweater"),
    # Starboy
    ("sarah", "starboy"), ("jay", "starboy"), ("luna", "starboy"),
    ("alex", "starboy"), ("tyler", "starboy"),
    # As It Was
    ("marcus", "as_it_was"), ("sarah", "as_it_was"), ("jay", "as_it_was"),
    ("luna", "as_it_was"),
    # Someone You Loved
    ("marcus", "someone"), ("sarah", "someone"), ("kira", "someone"),
    # Sunflower
    ("marcus", "sunflower"), ("jay", "sunflower"), ("kira", "sunflower"),
    ("nadia", "sunflower"),
    # Believer
    ("marcus", "believer"), ("sarah", "believer"), ("jay", "believer"),
    # Heat Waves
    ("marcus", "heat_waves"), ("kira", "heat_waves"), ("luna", "heat_waves"),
    # Lovely
    ("sarah", "lovely"), ("jay", "lovely"), ("kira", "lovely"),
    # Others - spread likes around
    ("marcus", "yellow"), ("luna", "yellow"),
    ("sarah", "closer"), ("alex", "closer"),
    ("jay", "riptide"), ("nadia", "riptide"),
    ("devon", "take_me"), ("tyler", "take_me"),
    ("alex", "one_dance"), ("nadia", "one_dance"), ("tyler", "one_dance"),
]

for user, track in likes:
    if track in track_ids:
        like_track(tokens[user], track_ids[track])
print(f"  {len(likes)} likes added")


# ============================================================
# COMMENTS & REPLIES
# ============================================================
print("\n=== Adding Comments & Replies ===")

# Blinding Lights - heavy discussion (this will be the main screenshot track)
if "blinding" in track_ids:
    tid = track_ids["blinding"]

    p1 = post_comment(tokens["sarah"], tid, "This synth line lives in my head rent free.")
    r1 = reply(tokens["jay"], p1, "The 80s influence is so clean here.")
    reply(tokens["kira"], p1, "Best driving song of the last decade honestly.")
    reply(tokens["marcus"], r1, "He said he was going for an A-ha vibe and nailed it.")

    p2 = post_comment(tokens["luna"], tid, "Still sounds fresh five years later.")
    reply(tokens["devon"], p2, "The production on this is ridiculous.")
    reply(tokens["alex"], p2, "Max Martin and The Weeknd are an insane combo.")

    p3 = post_comment(tokens["nadia"], tid, "This was everywhere in 2020. Deserved.")
    reply(tokens["tyler"], p3, "Longest charting song in Billboard history for a reason.")

    p4 = post_comment(tokens["devon"], tid, "The music video is a whole experience too.")
    reply(tokens["sarah"], p4, "The Vegas scenes are iconic.")

    p5 = post_comment(tokens["alex"], tid, "Production breakdown on this would be amazing to see.")

    # Votes
    vote(tokens["jay"], p1, 1)
    vote(tokens["kira"], p1, 1)
    vote(tokens["luna"], p1, 1)
    vote(tokens["devon"], p1, 1)
    vote(tokens["alex"], p1, 1)
    vote(tokens["nadia"], p1, 1)
    vote(tokens["marcus"], p2, 1)
    vote(tokens["sarah"], p2, 1)
    vote(tokens["devon"], p2, 1)
    vote(tokens["sarah"], p3, 1)
    vote(tokens["jay"], p3, 1)
    vote(tokens["marcus"], p4, 1)
    vote(tokens["luna"], p5, 1)
    vote(tokens["kira"], p5, 1)

    # Pin a comment (marcus is the artist who posted this track)
    pin_post(tokens["marcus"], tid, p1)
    print("  Blinding Lights: 5 comments, 7 replies, votes, 1 pin")


# Shape of You
if "shape" in track_ids:
    tid = track_ids["shape"]

    p1 = post_comment(tokens["marcus"], tid, "Say what you want but this hook is undeniable.")
    reply(tokens["luna"], p1, "Catchy is an understatement.")
    reply(tokens["jay"], p1, "It grew on me after hearing it 500 times lol.")

    p2 = post_comment(tokens["kira"], tid, "The marimba sample makes this track.")
    reply(tokens["devon"], p2, "Tropical house era Ed was peak.")

    p3 = post_comment(tokens["alex"], tid, "4 billion streams is absurd.")

    vote(tokens["sarah"], p1, 1)
    vote(tokens["luna"], p1, 1)
    vote(tokens["devon"], p1, 1)
    vote(tokens["marcus"], p2, 1)
    vote(tokens["sarah"], p2, 1)
    vote(tokens["jay"], p3, 1)

    pin_post(tokens["sarah"], tid, p2)
    print("  Shape of You: 3 comments, 3 replies, votes, 1 pin")


# Lean On
if "sweater" in track_ids:
    tid = track_ids["sweater"]

    p1 = post_comment(tokens["marcus"], tid, "Major Lazer changed the game with this one.")
    reply(tokens["sarah"], p1, "DJ Snake's production is flawless here.")

    p2 = post_comment(tokens["luna"], tid, "MO's vocals carry this track so hard.")
    reply(tokens["kira"], p2, "That drop still hits every time.")

    p3 = post_comment(tokens["devon"], tid, "2015 summer anthem no question.")
    reply(tokens["nadia"], p3, "Every festival was playing this on loop.")

    vote(tokens["jay"], p1, 1)
    vote(tokens["kira"], p1, 1)
    vote(tokens["luna"], p1, 1)
    vote(tokens["jay"], p2, 1)
    vote(tokens["sarah"], p3, 1)
    vote(tokens["tyler"], p3, 1)

    # jay is the artist, delegate marcus as moderator
    delegate_mod(tokens["jay"], tid, user_ids["marcus"])
    print("  Sweater Weather: 3 comments, 3 replies, votes, 1 moderator delegated")


# Starboy
if "starboy" in track_ids:
    tid = track_ids["starboy"]

    p1 = post_comment(tokens["jay"], tid, "Daft Punk production is immediately recognizable.")
    reply(tokens["sarah"], p1, "That guitar riff intro though.")

    p2 = post_comment(tokens["luna"], tid, "The Weeknd + Daft Punk is a cheat code.")
    reply(tokens["alex"], p2, "Miss Daft Punk every day.")
    reply(tokens["tyler"], p2, "RAM and this collab are top tier.")

    p3 = post_comment(tokens["kira"], tid, "Whole Starboy album was a shift for him.")

    vote(tokens["marcus"], p1, 1)
    vote(tokens["luna"], p1, 1)
    vote(tokens["sarah"], p2, 1)
    vote(tokens["jay"], p2, 1)
    vote(tokens["devon"], p3, 1)
    vote(tokens["nadia"], p3, 1)

    pin_post(tokens["marcus"], tid, p1)
    print("  Starboy: 3 comments, 3 replies, votes, 1 pin")


# As It Was
if "as_it_was" in track_ids:
    tid = track_ids["as_it_was"]

    p1 = post_comment(tokens["marcus"], tid, "This was inescapable in 2022.")
    reply(tokens["sarah"], p1, "Every store, every radio station.")

    p2 = post_comment(tokens["jay"], tid, "Harry went full indie pop and it worked.")
    reply(tokens["luna"], p2, "The intro synth is so good.")

    vote(tokens["kira"], p1, 1)
    vote(tokens["luna"], p1, 1)
    vote(tokens["devon"], p2, 1)
    print("  As It Was: 2 comments, 2 replies, votes")


# Levitating
if "someone" in track_ids:
    tid = track_ids["someone"]

    p1 = post_comment(tokens["sarah"], tid, "Dua Lipa really perfected the disco-pop formula here.")
    reply(tokens["marcus"], p1, "The bassline is so infectious.")

    p2 = post_comment(tokens["jay"], tid, "This was on repeat for all of 2021.")

    vote(tokens["luna"], p1, 1)
    vote(tokens["kira"], p1, 1)
    vote(tokens["luna"], p2, 1)
    print("  Someone You Loved: 2 comments, 1 reply, votes")


# Circles
if "sunflower" in track_ids:
    tid = track_ids["sunflower"]

    p1 = post_comment(tokens["marcus"], tid, "Post Malone going full pop-rock was unexpected but perfect.")
    reply(tokens["kira"], p1, "The guitar loop is so simple but so effective.")
    reply(tokens["jay"], p1, "Hollywood's Bleeding was a great album front to back.")

    p2 = post_comment(tokens["nadia"], tid, "This is the song I put on when I need to zone out.")

    vote(tokens["devon"], p1, 1)
    vote(tokens["luna"], p1, 1)
    vote(tokens["alex"], p1, 1)
    vote(tokens["tyler"], p2, 1)
    print("  Sunflower: 2 comments, 2 replies, votes")


# Believer
if "believer" in track_ids:
    tid = track_ids["believer"]

    p1 = post_comment(tokens["marcus"], tid, "This gets played at every sporting event for a reason.")
    reply(tokens["sarah"], p1, "Ultimate hype track.")

    p2 = post_comment(tokens["devon"], tid, "Imagine Dragons know how to write an anthem.")

    vote(tokens["nadia"], p1, 1)
    vote(tokens["jay"], p1, 1)
    vote(tokens["alex"], p2, 1)
    print("  Believer: 2 comments, 1 reply, votes")


# Heat Waves
if "heat_waves" in track_ids:
    tid = track_ids["heat_waves"]

    p1 = post_comment(tokens["marcus"], tid, "Slow burn hit. Took over a year to peak.")
    reply(tokens["luna"], p1, "The Minecraft streams helped lol.")
    reply(tokens["kira"], p1, "Dreamwastaken effect was real.")

    p2 = post_comment(tokens["sarah"], tid, "Late night driving music.")

    vote(tokens["tyler"], p1, 1)
    vote(tokens["devon"], p1, 1)
    vote(tokens["nadia"], p2, 1)
    print("  Heat Waves: 2 comments, 2 replies, votes")


# Lovely
if "lovely" in track_ids:
    tid = track_ids["lovely"]

    p1 = post_comment(tokens["jay"], tid, "Billie was 16 when she recorded this. Insane talent.")
    reply(tokens["sarah"], p1, "Khalid's voice adds so much depth.")

    p2 = post_comment(tokens["devon"], tid, "13 Reasons Why put this everywhere.")

    vote(tokens["luna"], p1, 1)
    vote(tokens["kira"], p1, 1)
    vote(tokens["marcus"], p2, 1)

    # luna posted this track, delegate jay as moderator
    delegate_mod(tokens["luna"], tid, user_ids["jay"])
    print("  Lovely: 2 comments, 1 reply, votes, 1 moderator delegated")


# Yellow, Closer, Riptide - lighter activity
if "yellow" in track_ids:
    p1 = post_comment(tokens["sarah"], track_ids["yellow"], "Timeless. 25 years and still hits.")
    reply(tokens["marcus"], p1, "Coldplay's best era.")
    vote(tokens["luna"], p1, 1)
    print("  Yellow: 1 comment, 1 reply")

if "closer" in track_ids:
    p1 = post_comment(tokens["luna"], track_ids["closer"], "2016 summer anthem. No debate.")
    reply(tokens["alex"], p1, "Every party had this on repeat.")
    vote(tokens["sarah"], p1, 1)
    vote(tokens["devon"], p1, 1)
    print("  Closer: 1 comment, 1 reply")

if "riptide" in track_ids:
    p1 = post_comment(tokens["kira"], track_ids["riptide"], "Bad Guy is still the hardest beat drop in pop music.")
    reply(tokens["nadia"], p1, "Billie was 17 making songs like this. Wild.")
    vote(tokens["jay"], p1, 1)
    print("  Bad Guy: 1 comment, 1 reply")

if "take_me" in track_ids:
    p1 = post_comment(tokens["marcus"], track_ids["take_me"], "Marshmello and Bastille was an unexpected combo that worked.")
    reply(tokens["luna"], p1, "The lyrics hit different when you actually listen to them.")
    vote(tokens["kira"], p1, 1)
    vote(tokens["tyler"], p1, 1)
    print("  Happier: 1 comment, 1 reply")

if "one_dance" in track_ids:
    p1 = post_comment(tokens["jay"], track_ids["one_dance"], "Wizkid's influence on this is massive.")
    reply(tokens["devon"], p1, "Kyla's vocal sample ties it all together.")
    vote(tokens["alex"], p1, 1)
    vote(tokens["nadia"], p1, 1)
    print("  One Dance: 1 comment, 1 reply")


# ============================================================
# ADMIN ACTIONS (generates audit log entries)
# ============================================================
print("\n=== Admin Actions (audit log) ===")

# Admin removes a post to show moderation in audit log
if "shape" in track_ids:
    # Add a mildly rule-breaking comment then remove it
    spam_post = post_comment(tokens["tyler"], track_ids["shape"], "Check my mixtape link in bio!!!")
    remove_post(tokens["admin"], spam_post)
    print("  Admin removed a spam post on Shape of You")


# ============================================================
# SUMMARY
# ============================================================
print("\n" + "=" * 60)
print("SEED COMPLETE")
print("=" * 60)
print(f"\nUsers: {len(users)}")
print(f"Tracks: {len(track_ids)}")
print(f"Password for all accounts: {PASSWORD}")
print()
print("=== LOGIN CREDENTIALS ===")
print()
print("ADMIN ACCOUNT:")
print(f"  Email: admin@soundboard.io")
print(f"  Password: {PASSWORD}")
print(f"  Role: admin")
print()
print("REGULAR USERS:")
for key, u in users.items():
    if key in ("admin", "banned"):
        continue
    role_note = ""
    if key == "marcus":
        role_note = " (posted Blinding Lights + Starboy, mod on Lean On)"
    elif key == "sarah":
        role_note = " (posted Shape of You + Bad Guy)"
    elif key == "jay":
        role_note = " (posted Lean On + Yellow, mod on Lovely)"
    elif key == "kira":
        role_note = " (posted As It Was + Happier)"
    elif key == "luna":
        role_note = " (posted Levitating + Lovely)"
    elif key == "devon":
        role_note = " (posted Circles + Closer)"
    print(f"  {u['display']:20s} {u['email']:30s}{role_note}")
print()
print("BANNED USER:")
print(f"  xXspam_botXx       spammer@temp.com")
print()
print("=== SCREENSHOT GUIDE ===")
print()
print("1. TRACK DISCUSSION (main feature showcase):")
print("   Login as: marcus@gmail.com (artist on Blinding Lights)")
print("   Go to: Blinding Lights track page")
print("   Shows: pinned comment, threaded replies, vote counts,")
print("          artist badge on marcus, regular user badges on others")
print()
print("2. ADMIN PANEL:")
print("   Login as: admin@soundboard.io")
print("   Go to: Admin dashboard")
print("   Shows: user list, banned user (xXspam_botXx), role management,")
print("          audit log with post removal + ban entries")
print()
print("3. MODERATION VIEW:")
print("   Login as: jay@proton.me (artist on Lean On)")
print("   Go to: Lean On track page")
print("   Shows: artist controls (pin/unpin, delegate moderator),")
print("          marcus shown as delegated moderator")
print()
print("4. DISCOVER PAGE:")
print("   Login as: any user (or guest)")
print("   Go to: Discover / home page")
print("   Shows: trending tracks (sorted by activity),")
print("          recently active, new arrivals")
print()
print("5. USER PROFILE / DASHBOARD:")
print("   Login as: marcus@gmail.com")
print("   Go to: Dashboard/profile")
print("   Shows: tracks posted, moderated tracks, recent activity, stats")
print()
print("6. DIFFERENT ROLE BADGES IN COMMENTS:")
print("   Login as: admin@soundboard.io")
print("   Go to: Blinding Lights track page")
print("   Shows: admin badge on SoundboardAdmin (if admin commented),")
print("          artist badge on marcusbeats, regular user badges")
print("   NOTE: Admin should also comment on Blinding Lights to show")
print("         the admin badge in the thread")
