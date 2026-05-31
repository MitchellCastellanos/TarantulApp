alter table vendor_boost_credits
    drop constraint if exists chk_vendor_boost_credits_source;

alter table vendor_boost_credits
    add constraint chk_vendor_boost_credits_source
        check (source in ('vendor_referral_signup', 'admin_grant'));
