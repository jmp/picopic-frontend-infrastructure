import * as cdk from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import {ViewerProtocolPolicy} from '@aws-cdk/aws-cloudfront';
import * as certificateManager from '@aws-cdk/aws-certificatemanager';
import * as s3 from '@aws-cdk/aws-s3';
import * as route53 from '@aws-cdk/aws-route53';
import * as targets from '@aws-cdk/aws-route53-targets';
import * as patterns from '@aws-cdk/aws-route53-patterns';

// Domain name used for the frontend
const domainName = 'picopic.io';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Bucket for hosting the static files (HTML, JS, etc.)
    const bucket = new s3.Bucket(this, 'PicopicFrontendBucket', {
      bucketName: 'picopic-frontend',
      websiteIndexDocument: 'index.html',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Container for routing traffic for the domain.
    // Amazon Route 53 must be configured as the DNS service for the domain.
    const hostedZone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName,
    });

    // Create an Origin Access Identity, which is like a virtual user
    // identity for fetching private objects from the S3 bucket.
    const cloudFrontOai = new cloudfront.OriginAccessIdentity(this, 'PicopicFrontendOAI');

    // The TLS certificate for the domain
    const certificate = new certificateManager.DnsValidatedCertificate(this, 'PicopicFrontendCertificate', {
      domainName,
      hostedZone,
      region: 'us-east-1', // required by CloudFront
    });

    // CloudFront Distribution for specifying the content origin
    // and how the content will be delivered to the users.
    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'PicopicFrontendDistribution', {
      originConfigs: [{
        s3OriginSource: {
          s3BucketSource: bucket,
          originAccessIdentity: cloudFrontOai,
        },
        behaviors: [{isDefaultBehavior: true}],
      }],
      viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(
        certificate,
        {
          aliases: [domainName],
          securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
          sslMethod: cloudfront.SSLMethod.SNI,
        },
      )
    });

    // Alias record to allow users to view the site via the domain
    new route53.ARecord(this, 'PicopicFrontendARecord', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
    });

    // Redirect http:// to https://
    new patterns.HttpsRedirect(this, 'PicopicFrontendRedirect', {
      zone: hostedZone,
      recordNames: [`www.${domainName}`],
      targetDomain: domainName,
    });

    bucket.grantRead(cloudFrontOai.grantPrincipal);
  }
}
