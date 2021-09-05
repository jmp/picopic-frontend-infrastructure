# picopic-frontend-infrastructure

This project defines the infrastructure for the [Picopic frontend][1].
The AWS CDK is used to define the infrastructure as code.

The frontend infrastructure makes use of the following AWS services:

* [S3](https://aws.amazon.com/s3/) for for hosting the static website
* [ACM](https://aws.amazon.com/certificate-manager/) for the TLS certificate
* [Route 53](https://aws.amazon.com/route53/) for the DNS
* [CloudFront](https://aws.amazon.com/cloudfront/) for the CDN

[1]: https://github.com/jmp/picopic-frontend