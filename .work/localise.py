"""One-off: reposition the site from a UK business to an India-focused business."""
import io, re

# GBP -> INR at sensible round numbers for the Indian small-business market.
PRICES = [
    ("\u00a31,490", "\u20b925,000"),
    ("\u00a33,490", "\u20b959,000"),
    ("\u00a36,900", "\u20b91,10,000"),
    ("\u00a349/month", "\u20b9999/month"),
    ("\u00a360/hour", "\u20b9500/hour"),
    ("\u00a3180k", "\u20b91,80,00,000"),
    ("\u00a392k", "\u20b992,00,000"),
    # Budget dropdown options
    ("\u00a31k \u2013 \u00a33k", "\u20b910,000 \u2013 \u20b930,000"),
    ("\u00a33k \u2013 \u00a36k", "\u20b930,000 \u2013 \u20b960,000"),
    ("\u00a36k \u2013 \u00a312k", "\u20b960,000 \u2013 \u20b91,20,000"),
    ("\u00a312k+", "\u20b91,20,000+"),
    # Locale
    ('<html lang="en-GB">', '<html lang="en-IN">'),
    ('content="en_GB"', 'content="en_IN"'),
    # Timezone
    ("9am\u20136pm GMT", "9am\u20136pm IST"),
    # Copy
    ("Remote-first \u00b7 Working across the UK",
     "Remote-first \u00b7 Serving businesses across India"),
    ("clients across the UK, Europe, and the US", "clients across India"),
    ("Do you work with businesses outside the UK?",
     "Do you work with businesses outside India?"),
]

PAGES = ["index.html", "services.html", "work.html", "about.html", "contact.html"]

for page in PAGES:
    html = io.open(page, encoding="utf-8").read()
    before = html
    for old, new in PRICES:
        html = html.replace(old, new)
    io.open(page, "w", encoding="utf-8").write(html)
    print("%-14s changed=%s" % (page, before != html))

# The SEO generator holds its own copies of these strings.
seo = io.open(".work/seo_build.py", encoding="utf-8").read()
for old, new in PRICES:
    if old.startswith("<html") or old.startswith("content="):
        continue
    seo = seo.replace(old, new)
seo = seo.replace('"inLanguage": "en-GB"', '"inLanguage": "en-IN"')
seo = seo.replace('content="en_GB"', 'content="en_IN"')
seo = seo.replace('"country": "GB"', '"country": "IN"')
seo = seo.replace('{"@type": "Country", "name": "United Kingdom"}',
                  '{"@type": "Country", "name": "India"}')
seo = seo.replace('"priceRange": "\\u00a3\\u00a3"', '"priceRange": "\\u20b9\\u20b9"')
seo = seo.replace('"priceRange": "\u00a3\u00a3"', '"priceRange": "\u20b9\u20b9"')
seo = seo.replace('"\\u00a3"', '"\\u20b9"')
io.open(".work/seo_build.py", "w", encoding="utf-8").write(seo)
print("seo_build.py updated")

# Number formatting must follow Indian lakh/crore grouping, not UK.
js = io.open("script.js", encoding="utf-8").read()
js = js.replace('toLocaleString("en-GB")', 'toLocaleString("en-IN")')
io.open("script.js", "w", encoding="utf-8").write(js)

api = io.open("quote-api/server.js", encoding="utf-8").read()
api = api.replace('toLocaleString("en-GB")', 'toLocaleString("en-IN")')
api = api.replace('<html lang="en-GB">', '<html lang="en-IN">')
io.open("quote-api/server.js", "w", encoding="utf-8").write(api)
print("script.js + quote-api updated")