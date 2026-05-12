# AWS Terraform

Low-cost demo infra.

## What it creates

- S3 bucket for the built Vite UI.
- CloudFront distribution in front of the UI.
- Optional App Runner service for the relayer container.
- IAM role for App Runner to pull from ECR.

## Cost control

Set `enable_relayer=false` to deploy only the static UI. App Runner costs more than static hosting, so only enable it while recording or presenting.

## Deploy static UI only

```sh
terraform init
terraform apply -var="enable_relayer=false"
```

## Deploy with relayer

```sh
terraform apply \
  -var="enable_relayer=true" \
  -var="relayer_image=<account>.dkr.ecr.<region>.amazonaws.com/clanworld-relayer:latest"
```

## Tear down

```sh
terraform destroy
```
