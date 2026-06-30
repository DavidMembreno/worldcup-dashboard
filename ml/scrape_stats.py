import urllib.request
import json
import time
import os

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

NAME_MAP = {
    'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
    'Congo DR': 'DR Congo',
    'Czechia': 'Czech Republic',
    'Türkiye': 'Turkey',
}

def norm(name):
    return NAME_MAP.get(name, name) if name else name

ESPN_EVENTS = {
    '760415': {'home': 'Mexico', 'away': 'South Africa', 'date': '2026-06-11'},
    '760414': {'home': 'South Korea', 'away': 'Czechia', 'date': '2026-06-12'},
    '760416': {'home': 'Canada', 'away': 'Bosnia-Herzegovina', 'date': '2026-06-12'},
    '760417': {'home': 'United States', 'away': 'Paraguay', 'date': '2026-06-13'},
    '760420': {'home': 'Qatar', 'away': 'Switzerland', 'date': '2026-06-13'},
    '760419': {'home': 'Brazil', 'away': 'Morocco', 'date': '2026-06-13'},
    '760418': {'home': 'Haiti', 'away': 'Scotland', 'date': '2026-06-14'},
    '760421': {'home': 'Australia', 'away': 'Turkey', 'date': '2026-06-14'},
    '760422': {'home': 'Germany', 'away': 'Curacao', 'date': '2026-06-14'},
    '760425': {'home': 'Netherlands', 'away': 'Japan', 'date': '2026-06-14'},
    '760423': {'home': 'Ivory Coast', 'away': 'Ecuador', 'date': '2026-06-14'},
    '760424': {'home': 'Sweden', 'away': 'Tunisia', 'date': '2026-06-15'},
    '760428': {'home': 'Spain', 'away': 'Cape Verde', 'date': '2026-06-15'},
    '760426': {'home': 'Belgium', 'away': 'Egypt', 'date': '2026-06-15'},
    '760429': {'home': 'Uruguay', 'away': 'Saudi Arabia', 'date': '2026-06-15'},
    '760427': {'home': 'Iran', 'away': 'New Zealand', 'date': '2026-06-16'},
    '760432': {'home': 'France', 'away': 'Senegal', 'date': '2026-06-16'},
    '760430': {'home': 'Iraq', 'away': 'Norway', 'date': '2026-06-16'},
    '760433': {'home': 'Argentina', 'away': 'Algeria', 'date': '2026-06-17'},
    '760431': {'home': 'Austria', 'away': 'Jordan', 'date': '2026-06-17'},
    '760435': {'home': 'Portugal', 'away': 'Congo DR', 'date': '2026-06-17'},
    '760437': {'home': 'England', 'away': 'Croatia', 'date': '2026-06-17'},
    '760434': {'home': 'Ghana', 'away': 'Panama', 'date': '2026-06-17'},
    '760436': {'home': 'Uzbekistan', 'away': 'Colombia', 'date': '2026-06-18'},
    '760438': {'home': 'Czechia', 'away': 'South Africa', 'date': '2026-06-18'},
    '760439': {'home': 'Switzerland', 'away': 'Bosnia-Herzegovina', 'date': '2026-06-18'},
    '760440': {'home': 'Canada', 'away': 'Qatar', 'date': '2026-06-18'},
    '760441': {'home': 'Mexico', 'away': 'South Korea', 'date': '2026-06-19'},
    '760442': {'home': 'United States', 'away': 'Australia', 'date': '2026-06-19'},
    '760445': {'home': 'Scotland', 'away': 'Morocco', 'date': '2026-06-19'},
    '760444': {'home': 'Brazil', 'away': 'Haiti', 'date': '2026-06-20'},
    '760443': {'home': 'Turkey', 'away': 'Paraguay', 'date': '2026-06-20'},
    '760447': {'home': 'Netherlands', 'away': 'Sweden', 'date': '2026-06-20'},
    '760448': {'home': 'Germany', 'away': 'Ivory Coast', 'date': '2026-06-20'},
    '760446': {'home': 'Ecuador', 'away': 'Curacao', 'date': '2026-06-21'},
    '760449': {'home': 'Tunisia', 'away': 'Japan', 'date': '2026-06-21'},
    '760453': {'home': 'Spain', 'away': 'Saudi Arabia', 'date': '2026-06-21'},
    '760451': {'home': 'Belgium', 'away': 'Iran', 'date': '2026-06-21'},
    '760450': {'home': 'Uruguay', 'away': 'Cape Verde', 'date': '2026-06-21'},
    '760452': {'home': 'New Zealand', 'away': 'Egypt', 'date': '2026-06-22'},
    '760456': {'home': 'Argentina', 'away': 'Austria', 'date': '2026-06-22'},
    '760457': {'home': 'France', 'away': 'Iraq', 'date': '2026-06-22'},
    '760454': {'home': 'Norway', 'away': 'Senegal', 'date': '2026-06-23'},
    '760455': {'home': 'Jordan', 'away': 'Algeria', 'date': '2026-06-23'},
    '760461': {'home': 'Portugal', 'away': 'Uzbekistan', 'date': '2026-06-23'},
    '760458': {'home': 'England', 'away': 'Ghana', 'date': '2026-06-23'},
    '760460': {'home': 'Panama', 'away': 'Croatia', 'date': '2026-06-23'},
    '760459': {'home': 'Colombia', 'away': 'Congo DR', 'date': '2026-06-24'},
    '760462': {'home': 'Bosnia-Herzegovina', 'away': 'Qatar', 'date': '2026-06-24'},
    '760463': {'home': 'Switzerland', 'away': 'Canada', 'date': '2026-06-24'},
    '760464': {'home': 'Morocco', 'away': 'Haiti', 'date': '2026-06-24'},
    '760465': {'home': 'Brazil', 'away': 'Scotland', 'date': '2026-06-24'},
    '760467': {'home': 'Mexico', 'away': 'Czechia', 'date': '2026-06-25'},
    '760466': {'home': 'South Korea', 'away': 'South Africa', 'date': '2026-06-25'},
    '760473': {'home': 'Ivory Coast', 'away': 'Curacao', 'date': '2026-06-25'},
    '760468': {'home': 'Germany', 'away': 'Ecuador', 'date': '2026-06-25'},
    '760471': {'home': 'Sweden', 'away': 'Japan', 'date': '2026-06-25'},
    '760472': {'home': 'Netherlands', 'away': 'Tunisia', 'date': '2026-06-25'},
    '760469': {'home': 'Australia', 'away': 'Paraguay', 'date': '2026-06-26'},
    '760470': {'home': 'United States', 'away': 'Turkey', 'date': '2026-06-26'},
    '760475': {'home': 'France', 'away': 'Norway', 'date': '2026-06-26'},
    '760474': {'home': 'Iraq', 'away': 'Senegal', 'date': '2026-06-26'},
    '760478': {'home': 'Saudi Arabia', 'away': 'Cape Verde', 'date': '2026-06-27'},
    '760479': {'home': 'Spain', 'away': 'Uruguay', 'date': '2026-06-27'},
    '760476': {'home': 'Iran', 'away': 'Egypt', 'date': '2026-06-27'},
    '760477': {'home': 'Belgium', 'away': 'New Zealand', 'date': '2026-06-27'},
    '760480': {'home': 'Ghana', 'away': 'Croatia', 'date': '2026-06-27'},
    '760485': {'home': 'England', 'away': 'Panama', 'date': '2026-06-27'},
    '760481': {'home': 'Portugal', 'away': 'Colombia', 'date': '2026-06-27'},
    '760482': {'home': 'Uzbekistan', 'away': 'Congo DR', 'date': '2026-06-27'},
    '760484': {'home': 'Austria', 'away': 'Algeria', 'date': '2026-06-28'},
    '760483': {'home': 'Argentina', 'away': 'Jordan', 'date': '2026-06-28'},
    '760486': {'home': 'South Africa', 'away': 'Canada', 'date': '2026-06-28'},
    '760487': {'home': 'Brazil', 'away': 'Japan', 'date': '2026-06-29'},
    '760488': {'home': 'Netherlands', 'away': 'Morocco', 'date': '2026-06-30'},
    '760489': {'home': 'Germany', 'away': 'Paraguay', 'date': '2026-06-29'},
    '760490': {'home': 'Ivory Coast', 'away': 'Norway', 'date': '2026-06-30'},
    '760491': {'home': 'Mexico', 'away': 'Ecuador', 'date': '2026-07-01'},
    '760492': {'home': 'France', 'away': 'Sweden', 'date': '2026-06-30'},
    '760493': {'home': 'Belgium', 'away': 'Senegal', 'date': '2026-07-01'},
    '760494': {'home': 'United States', 'away': 'Bosnia-Herzegovina', 'date': '2026-07-02'},
    '760495': {'home': 'England', 'away': 'Congo DR', 'date': '2026-07-01'},
    '760496': {'home': 'Portugal', 'away': 'Croatia', 'date': '2026-07-02'},
    '760497': {'home': 'Spain', 'away': 'Austria', 'date': '2026-07-02'},
    '760498': {'home': 'Switzerland', 'away': 'Algeria', 'date': '2026-07-03'},
    '760499': {'home': 'Australia', 'away': 'Egypt', 'date': '2026-07-03'},
    '760500': {'home': 'Argentina', 'away': 'Cape Verde', 'date': '2026-07-03'},
    '760501': {'home': 'Colombia', 'away': 'Ghana', 'date': '2026-07-04'},
    '760502': {'home': 'R32 1 Winner', 'away': 'R32 3 Winner', 'date': '2026-07-04'},
    '760503': {'home': 'R32 2 Winner', 'away': 'R32 5 Winner', 'date': '2026-07-04'},
    '760504': {'home': 'R32 4 Winner', 'away': 'R32 6 Winner', 'date': '2026-07-05'},
    '760505': {'home': 'R32 7 Winner', 'away': 'R32 8 Winner', 'date': '2026-07-06'},
    '760506': {'home': 'R32 11 Winner', 'away': 'R32 12 Winner', 'date': '2026-07-06'},
    '760507': {'home': 'R32 9 Winner', 'away': 'R32 10 Winner', 'date': '2026-07-07'},
    '760508': {'home': 'R32 13 Winner', 'away': 'R32 15 Winner', 'date': '2026-07-07'},
    '760509': {'home': 'R32 14 Winner', 'away': 'R32 16 Winner', 'date': '2026-07-07'},
    '760510': {'home': 'R16 1 Winner', 'away': 'R16 2 Winner', 'date': '2026-07-09'},
    '760511': {'home': 'R16 5 Winner', 'away': 'R16 6 Winner', 'date': '2026-07-10'},
    '760512': {'home': 'R16 3 Winner', 'away': 'R16 4 Winner', 'date': '2026-07-11'},
    '760513': {'home': 'R16 7 Winner', 'away': 'R16 8 Winner', 'date': '2026-07-12'},
    '760514': {'home': 'QF 1 Winner', 'away': 'QF 2 Winner', 'date': '2026-07-14'},
    '760515': {'home': 'QF 3 Winner', 'away': 'QF 4 Winner', 'date': '2026-07-15'},
    '760517': {'home': 'SF 1 Winner', 'away': 'SF 2 Winner', 'date': '2026-07-19'},
}

STAT_MAP = {
    'possessionPct':    ('home_possession', 'away_possession'),
    'totalShots':       ('home_shots', 'away_shots'),
    'shotsOnTarget':    ('home_shots_on_target', 'away_shots_on_target'),
    'shotPct':          ('home_shot_pct', 'away_shot_pct'),
    'accuratePasses':   ('home_passes_accurate', 'away_passes_accurate'),
    'totalPasses':      ('home_passes_total', 'away_passes_total'),
    'passPct':          ('home_pass_pct', 'away_pass_pct'),
    'wonCorners':       ('home_corners', 'away_corners'),
    'foulsCommitted':   ('home_fouls', 'away_fouls'),
    'yellowCards':      ('home_yellows', 'away_yellows'),
    'redCards':         ('home_reds', 'away_reds'),
    'saves':            ('home_saves', 'away_saves'),
    'offsides':         ('home_offsides', 'away_offsides'),
    'effectiveTackles': ('home_tackles', 'away_tackles'),
    'interceptions':    ('home_interceptions', 'away_interceptions'),
    'totalLongBalls':   ('home_long_balls', 'away_long_balls'),
    'accurateCrosses':  ('home_crosses_accurate', 'away_crosses_accurate'),
    'blockedShots':     ('home_shots_blocked', 'away_shots_blocked'),
}

def _safe_float(val):
    try:
        return float(str(val).strip())
    except:
        return None

def fetch_match_data(espn_id, expected_home, expected_away):
    """Fetch stats AND score from ESPN, binding values to TEAM NAME rather than
    trusting ESPN's homeAway field, since ESPN's home/away designation has been
    observed to be inconsistent between calls for the same match."""
    url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event={espn_id}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read().decode())

    comp = data.get('header', {}).get('competitions', [{}])[0]
    competitors = comp.get('competitors', [])
    status = comp.get('status', {}).get('type', {}).get('name', '')

    # find each competitor by actual team display name, not by homeAway role
    expected_home_n = norm(expected_home)
    expected_away_n = norm(expected_away)

    home_competitor = None
    away_competitor = None
    for c in competitors:
        team_name = norm(c.get('team', {}).get('displayName', ''))
        if team_name == expected_home_n:
            home_competitor = c
        elif team_name == expected_away_n:
            away_competitor = c

    if home_competitor is None or away_competitor is None:
        # fallback: couldn't match by name (e.g. placeholder "Group X Winner" labels
        # for future rounds) — use ESPN's own homeAway field as a last resort
        home_competitor = next((c for c in competitors if c.get('homeAway') == 'home'), {})
        away_competitor = next((c for c in competitors if c.get('homeAway') == 'away'), {})

    home_score = int(home_competitor.get('score', 0)) if home_competitor.get('score') else None
    away_score = int(away_competitor.get('score', 0)) if away_competitor.get('score') else None

    # boxscore: also match by team name, not homeAway role
    teams = data.get('boxscore', {}).get('teams', [])
    home_box = None
    away_box = None
    for t in teams:
        team_name = norm(t.get('team', {}).get('displayName', ''))
        if team_name == expected_home_n:
            home_box = t
        elif team_name == expected_away_n:
            away_box = t

    if home_box is None or away_box is None:
        home_box = next((t for t in teams if t.get('homeAway') == 'home'), {})
        away_box = next((t for t in teams if t.get('homeAway') == 'away'), {})

    result = {
        'home_score': home_score,
        'away_score': away_score,
        'status': status,
    }

    home_stats = {s['name']: s.get('value', s.get('displayValue'))
                  for s in (home_box.get('statistics', []) if home_box else [])}
    away_stats = {s['name']: s.get('value', s.get('displayValue'))
                  for s in (away_box.get('statistics', []) if away_box else [])}

    for espn_key, (home_field, away_field) in STAT_MAP.items():
        result[home_field] = _safe_float(home_stats.get(espn_key))
        result[away_field] = _safe_float(away_stats.get(espn_key))

    return result

def run():
    output_path = os.path.join(
        os.path.dirname(__file__), '..', 'src', 'ml', 'match_stats.json'
    )

    if os.path.exists(output_path):
        with open(output_path) as f:
            existing = json.load(f)
    else:
        existing = {}

    updated = 0
    skipped = 0

    for espn_id, meta in ESPN_EVENTS.items():
        home = meta['home']
        away = meta['away']
        date = meta['date']

        if (espn_id in existing and
            existing[espn_id].get('home_possession') is not None and
            existing[espn_id].get('home_score') is not None):
            print(f'  Skipping {home} vs {away} (cached)')
            skipped += 1
            continue

        print(f'  Fetching {home} vs {away} ({date})...')
        time.sleep(1)

        try:
            match_data = fetch_match_data(espn_id, home, away)

            if match_data.get('status') not in ('STATUS_FULL_TIME', 'STATUS_FINAL_PEN'):
                print(f'    Not finished yet ({match_data.get("status")}) — skipping')
                continue

            match_data['home'] = home
            match_data['away'] = away
            match_data['date'] = date
            match_data['espn_id'] = espn_id
            existing[espn_id] = match_data
            updated += 1
            print(f'    Score: {match_data.get("home_score")}-{match_data.get("away_score")} | '
                  f'Possession: {match_data.get("home_possession")}% vs {match_data.get("away_possession")}%')

        except Exception as e:
            print(f'    Error: {e}')

    with open(output_path, 'w') as f:
        json.dump(existing, f, indent=2)

    print(f'\nDone. {updated} new, {skipped} cached → {output_path}')

if __name__ == '__main__':
    run()
