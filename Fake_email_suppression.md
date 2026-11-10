## Guide on how to manage contact for email addresses

### Update disposable-email-domains
`update pnpm --filter @longrunner/shared-policy up disposable-email-domains`

### Add email/domain to supressed email list
- edit runtime/suppressed-email.txt
  
- add either email or email domain:
  - One email (or whole domain) per line.
  - Lines starting with # are comments.
  - Example blocked addresses:
    - bounced-user@example.com
    - hardbounce@broken-domain.test
  - Optional domain-level suppression:
    - @broken-domain.test

- Redeploy to enforce

## Update without a full redeploy

**On longrunner**

`cd /home/hutch/dockers/longrunner-platform` 

`nano runtime/suppressed-email.txt`

- add either email or email domain as above
- re-start docker container
  
`docker compose down && docker compose up -d`

**ENSURE: runtime/suppressed-email.txt is updated locally on mac**
Server edits will be over-written on re-deploy otherwise
