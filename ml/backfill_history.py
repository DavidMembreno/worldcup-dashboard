import pandas as pd
import numpy as np
import json
import os
from collections import Counter
from xgboost import XGBClassifier

BASE  = os.path.dirname(__file__)
HIST  = os.path.join(BASE, 'historical_results.csv')
STATS = os.path.join(BASE, '..', 'src', 'ml', 'match_stats.json')
HIST_OUT = os.path.join(BASE, '..', 'src', 'ml', 'prediction_history.json')

import sys
BACKFILL_DATE = sys.argv[1] if len(sys.argv) > 1 else '2026-06-16'

WC26_TEAMS = [
    'Mexico','South Africa','South Korea','Czech Republic','Canada',
    'Bosnia and Herzegovina','United States','Paraguay','Qatar','Switzerland',
    'Brazil','Morocco','Haiti','Scotland','Australia','Turkey','Germany',
    'Curacao','Netherlands','Japan','Ivory Coast','Ecuador','Sweden','Tunisia',
    'Spain','Cape Verde','Belgium','Egypt','Uruguay','Saudi Arabia','Iran',
    'New Zealand','France','Senegal','Iraq','Norway','Argentina','Algeria',
    'Austria','Jordan','Portugal','DR Congo','England','Croatia','Ghana',
    'Panama','Uzbekistan','Colombia'
]

FIFA_RANKINGS = {
    'Argentina': 1, 'France': 2, 'England': 3, 'Brazil': 4,
    'Portugal': 5, 'Spain': 6, 'Netherlands': 7, 'Germany': 8,
    'Belgium': 9, 'Uruguay': 10, 'Colombia': 11, 'Morocco': 12,
    'Japan': 13, 'United States': 14, 'Mexico': 15, 'Croatia': 16,
    'Senegal': 17, 'Iran': 18, 'South Korea': 19, 'Denmark': 20,
    'Austria': 21, 'Sweden': 22, 'Norway': 23, 'Switzerland': 24,
    'Australia': 25, 'Turkey': 26, 'Ecuador': 27, 'Tunisia': 28,
    'Egypt': 29, 'Algeria': 30, 'Scotland': 31, 'Ukraine': 32,
    'Canada': 33, 'Saudi Arabia': 34, 'Qatar': 35, 'Iraq': 36,
    'Ivory Coast': 37, 'Czech Republic': 38, 'New Zealand': 39,
    'South Africa': 40, 'Ghana': 41, 'Bosnia and Herzegovina': 42,
    'Paraguay': 43, 'Panama': 44, 'Bolivia': 45, 'Jordan': 46,
    'Cape Verde': 47, 'Haiti': 48, 'Uzbekistan': 49, 'DR Congo': 50,
    'Curacao': 86, 'Congo DR': 50,
}

def expected(ra, rb):
    return 1 / (1 + 10 ** ((rb - ra) / 400))

def update_elo(ra, rb, result, k=32):
    ea = expected(ra, rb)
    eb = expected(rb, ra)
    sa, sb = (1,0) if result=='home' else (0,1) if result=='away' else (0.5,0.5)
    return ra + k*(sa-ea), rb + k*(sb-eb)

print(f'Backfilling history for {BACKFILL_DATE}...')

# load historical 2025-2026 data
df = pd.read_csv(HIST)
df = df.dropna(subset=['home_score','away_score'])
df['date'] = pd.to_datetime(df['date'])
df = df[df['date'] >= '2025-01-01'].copy()

# load match_stats but ONLY keep matches that happened on or before BACKFILL_DATE
with open(STATS) as f:
    all_match_stats = json.load(f)

cutoff = pd.Timestamp(BACKFILL_DATE)
match_stats = {
    k: v for k, v in all_match_stats.items()
    if v.get('status') == 'STATUS_FULL_TIME' and
    pd.Timestamp(v.get('date', '2026-01-01')) <= cutoff
}
print(f'  Matches available as of {BACKFILL_DATE}: {len(match_stats)}')

# compute Elo using only historical + matches up to cutoff
elo = {}
for _, row in df.iterrows():
    h, a = row['home_team'], row['away_team']
    if h not in elo: elo[h] = 1500
    if a not in elo: elo[a] = 1500
    result = 'home' if row['home_score'] > row['away_score'] else \
             'away' if row['home_score'] < row['away_score'] else 'draw'
    elo[h], elo[a] = update_elo(elo[h], elo[a], result, k=40)

for stat in match_stats.values():
    home, away = stat.get('home'), stat.get('away')
    hg, ag = stat.get('home_score'), stat.get('away_score')
    if not home or not away or hg is None or ag is None: continue
    if home not in elo: elo[home] = 1500
    if away not in elo: elo[away] = 1500
    result = 'home' if hg > ag else 'away' if hg < ag else 'draw'
    elo[home], elo[away] = update_elo(elo[home], elo[away], result, k=60)

# XGBoost
rows = []
for _, row in df.iterrows():
    h, a = row['home_team'], row['away_team']
    hs, as_ = row['home_score'], row['away_score']
    result = 1 if hs > as_ else 0 if hs < as_ else 2
    rows.append({
        'elo_diff': elo.get(h,1500) - elo.get(a,1500),
        'elo_home': elo.get(h,1500), 'elo_away': elo.get(a,1500),
        'possession_diff': 0, 'shots_diff': 0, 'pass_pct_diff': 0, 'result': result
    })
for stat in match_stats.values():
    home, away = stat.get('home'), stat.get('away')
    if not home or not away: continue
    hg, ag = stat.get('home_score', 0) or 0, stat.get('away_score', 0) or 0
    result = 1 if hg > ag else 0 if hg < ag else 2
    row = {
        'elo_diff': elo.get(home,1500) - elo.get(away,1500),
        'elo_home': elo.get(home,1500), 'elo_away': elo.get(away,1500),
        'possession_diff': float(stat.get('home_possession') or 50) - float(stat.get('away_possession') or 50),
        'shots_diff': float(stat.get('home_shots_on_target') or 3) - float(stat.get('away_shots_on_target') or 3),
        'pass_pct_diff': float(stat.get('home_pass_pct') or 0.8) - float(stat.get('away_pass_pct') or 0.8),
        'result': result
    }
    for _ in range(5): rows.append(row)

feat_df = pd.DataFrame(rows).dropna()
X = feat_df[['elo_diff','elo_home','elo_away','possession_diff','shots_diff','pass_pct_diff']]
y = feat_df['result']
xgb = XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.1,
                    eval_metric='mlogloss', random_state=42, verbosity=0)
xgb.fit(X, y)

def xgb_predict(home, away, h_poss=50, a_poss=50, h_shots=3, a_shots=3, h_pass=0.8, a_pass=0.8):
    feats = pd.DataFrame([{
        'elo_diff': elo.get(home,1500) - elo.get(away,1500),
        'elo_home': elo.get(home,1500), 'elo_away': elo.get(away,1500),
        'possession_diff': h_poss - a_poss, 'shots_diff': h_shots - a_shots, 'pass_pct_diff': h_pass - a_pass,
    }])
    probs = xgb.predict_proba(feats)[0]
    classes = list(xgb.classes_)
    return {
        'home': float(probs[classes.index(1)]) if 1 in classes else 0.33,
        'away': float(probs[classes.index(0)]) if 0 in classes else 0.33,
        'draw': float(probs[classes.index(2)]) if 2 in classes else 0.34,
    }

# Monte Carlo
import random
GROUPS = {
    'A': ['Mexico','South Korea','Czech Republic','South Africa'],
    'B': ['Canada','Bosnia and Herzegovina','Qatar','Switzerland'],
    'C': ['Brazil','Morocco','Haiti','Scotland'],
    'D': ['United States','Australia','Turkey','Paraguay'],
    'E': ['Germany','Ivory Coast','Ecuador','Curacao'],
    'F': ['Netherlands','Japan','Sweden','Tunisia'],
    'G': ['Belgium','New Zealand','Iran','Egypt'],
    'H': ['Spain','Uruguay','Saudi Arabia','Cape Verde'],
    'I': ['France','Senegal','Iraq','Norway'],
    'J': ['Argentina','Algeria','Austria','Jordan'],
    'K': ['Portugal','DR Congo','England','Croatia'],
    'L': ['Ghana','Panama','Uzbekistan','Colombia'],
}

def elo_match_probs(home, away):
    eh, ea = elo.get(home, 1500), elo.get(away, 1500)
    exp_h = expected(eh, ea)
    return exp_h*0.72, 0.28, (1-exp_h)*0.72

def run_monte_carlo(sims=10000):
    trophy_wins = {t: 0 for t in WC26_TEAMS}
    def sim_match(home, away):
        hw, dp, aw = elo_match_probs(home, away)
        r = random.random()
        if r < hw: return home
        elif r < hw+dp: return random.choice([home, away])
        else: return away
    def get_group_qualifiers(teams):
        ranked = sorted(teams, key=lambda t: -elo.get(t, 1500))
        return ranked[:2], ranked[2]
    for _ in range(sims):
        qualifiers, third_place = [], []
        for g, teams in GROUPS.items():
            top2, third = get_group_qualifiers(teams)
            qualifiers.extend(top2); third_place.append(third)
        best_thirds = sorted(third_place, key=lambda t: -elo.get(t, 1500))[:8]
        bracket = qualifiers + best_thirds
        random.shuffle(bracket)
        while len(bracket) > 1:
            next_round = []
            for i in range(0, len(bracket), 2):
                winner = sim_match(bracket[i], bracket[i+1]) if i+1 < len(bracket) else bracket[i]
                next_round.append(winner)
            bracket = next_round
        if bracket: trophy_wins[bracket[0]] += 1
    return {t: round(trophy_wins[t]/sims, 4) for t in WC26_TEAMS}

mc_probs = run_monte_carlo(10000)

# Ensemble signals
finished_count = len(match_stats)
W = {'elo': 0.50, 'xgb': 0.10, 'form': 0.40} if finished_count < 24 else {'elo': 0.25, 'xgb': 0.25, 'form': 0.50}

elo_raw = {t: expected(elo.get(t,1500), np.mean([elo.get(x,1500) for x in WC26_TEAMS])) for t in WC26_TEAMS}
elo_total = sum(elo_raw.values())
elo_probs = {t: v/elo_total for t,v in elo_raw.items()}

xgb_scores = {}
for t in WC26_TEAMS:
    team_stats = [s for s in match_stats.values() if s.get('home')==t or s.get('away')==t]
    if not team_stats:
        xgb_scores[t] = 0.5; continue
    probs = []
    for s in team_stats:
        is_home = s.get('home') == t
        opp = s.get('away') if is_home else s.get('home')
        hp = float(s.get('home_possession') or 50); ap = float(s.get('away_possession') or 50)
        hsh = float(s.get('home_shots_on_target') or 3); ash = float(s.get('away_shots_on_target') or 3)
        hpp = float(s.get('home_pass_pct') or 0.8); app = float(s.get('away_pass_pct') or 0.8)
        if not is_home: hp,ap=ap,hp; hsh,ash=ash,hsh; hpp,app=app,hpp
        p = xgb_predict(t, opp, hp, ap, hsh, ash, hpp, app)
        probs.append(p['home'])
    xgb_scores[t] = float(np.mean(probs))
xgb_total = sum(xgb_scores.values())
xgb_probs = {t: v/xgb_total for t,v in xgb_scores.items()}

form_scores = {}
for t in WC26_TEAMS:
    pts, gf, ga, played = 0, 0, 0, 0
    for s in match_stats.values():
        if s.get('home') == t:
            hg, ag = s.get('home_score') or 0, s.get('away_score') or 0
            opp_rank = FIFA_RANKINGS.get(s.get('away'), 50)
            w = max(0.5, (51-opp_rank)/25)
            gf+=hg; ga+=ag; played+=1
            pts += (3 if hg>ag else 1 if hg==ag else 0) * w
        elif s.get('away') == t:
            hg, ag = s.get('home_score') or 0, s.get('away_score') or 0
            opp_rank = FIFA_RANKINGS.get(s.get('home'), 50)
            w = max(0.5, (51-opp_rank)/25)
            gf+=ag; ga+=hg; played+=1
            pts += (3 if ag>hg else 1 if ag==hg else 0) * w
    form_scores[t] = 1.0 if played==0 else (pts/played) + 0.3*((gf-ga)/played) + 0.1
form_total = sum(max(v,0.01) for v in form_scores.values())
form_probs = {t: max(form_scores[t],0.01)/form_total for t in WC26_TEAMS}

ensemble = {t: W['elo']*elo_probs[t] + W['xgb']*xgb_probs[t] + W['form']*form_probs[t] for t in WC26_TEAMS}
total = sum(ensemble.values())
ensemble = {t: v/total for t,v in ensemble.items()}

# avg stats per team
def team_avg(t, field):
    vals = []
    for s in match_stats.values():
        if s.get('home') == t and s.get(f'home_{field}') is not None:
            vals.append(float(s[f'home_{field}']))
        elif s.get('away') == t and s.get(f'away_{field}') is not None:
            vals.append(float(s[f'away_{field}']))
    return round(np.mean(vals), 1) if vals else None

team_snapshots = {}
for t in WC26_TEAMS:
    team_snapshots[t] = {
        'elo': round(elo.get(t, 1500), 1),
        'form': round(form_probs[t]*100, 2),
        'xgb': round(xgb_probs[t]*100, 2),
        'mc': round(mc_probs.get(t, 0)*100, 2),
        'ensemble': round(ensemble.get(t, 0)*100, 4),
        'avg_possession': team_avg(t, 'possession'),
        'avg_shots_on_target': team_avg(t, 'shots_on_target'),
        'avg_pass_pct': round(team_avg(t, 'pass_pct')*100, 1) if team_avg(t, 'pass_pct') else None,
    }

finalist_probs = sorted([{'team':t,'probability':round(p,4)} for t,p in ensemble.items()], key=lambda x:-x['probability'])
mc_ranked = sorted([{'team':t,'probability':mc_probs[t]} for t in WC26_TEAMS], key=lambda x:-x['probability'])

new_entry = {
    'date': BACKFILL_DATE,
    'predicted_winner': finalist_probs[0]['team'],
    'probability': finalist_probs[0]['probability'],
    'mc_winner': mc_ranked[0]['team'],
    'mc_probability': mc_ranked[0]['probability'],
    'top5': finalist_probs[:5],
    'matches_used': finished_count,
    'weights': W,
    'team_snapshots': team_snapshots,
}

# insert into history, sorted by date, no duplicates
with open(HIST_OUT) as f:
    history = json.load(f)

history = [h for h in history if h['date'] != BACKFILL_DATE]
history.append(new_entry)
history.sort(key=lambda h: h['date'])

with open(HIST_OUT, 'w') as f:
    json.dump(history, f, indent=2)

print(f'Backfilled {BACKFILL_DATE}. History now has {len(history)} entries:')
for h in history:
    print(f'  {h["date"]}: {h["predicted_winner"]} ({h["probability"]*100:.1f}%)')
