import dns.resolver

DOMAIN = "arisecap.net"

def check_record(domain, record_type):
    try:
        answers = dns.resolver.resolve(domain, record_type)
        return [r.to_text() for r in answers]
    except Exception as e:
        return [f"❌ {record_type} lookup failed: {e}"]

def check_txt_record(domain, keyword):
    try:
        answers = dns.resolver.resolve(domain, 'TXT')
        return [r.to_text() for r in answers if keyword in r.to_text()]
    except Exception as e:
        return [f"❌ TXT lookup failed: {e}"]

def dns_health_check(domain):
    print(f"\n🔍 DNS Health Check for {domain}\n")

    mx = check_record(domain, 'MX')
    print("📨 MX Records:")
    for r in mx: print(f"  - {r}")

    spf = check_txt_record(domain, 'v=spf1')
    print("\n🛡️ SPF Record:")
    for r in spf: print(f"  - {r}")

    dkim = check_txt_record(f"google._domainkey.{domain}", 'v=DKIM1')
    print("\n🔐 DKIM Record:")
    for r in dkim: print(f"  - {r}")

    dmarc = check_txt_record(f"_dmarc.{domain}", 'v=DMARC1')
    print("\n📋 DMARC Record:")
    for r in dmarc: print(f"  - {r}")

    input("\n✅ Press Enter to exit...")

# Run it
if __name__ == "__main__":
    dns_health_check(DOMAIN)