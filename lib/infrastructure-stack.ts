import * as cdk from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as certificateManager from '@aws-cdk/aws-certificatemanager';
import * as s3 from '@aws-cdk/aws-s3';
import * as route53 from '@aws-cdk/aws-route53';
import * as targets from '@aws-cdk/aws-route53-targets';
import * as patterns from '@aws-cdk/aws-route53-patterns';

const domainName = 'picopic.io';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'PicopicFrontendBucket', {
      bucketName: 'picopic-frontend',
      websiteIndexDocument: 'index.html',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const hostedZone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName,
    });

    const cloudFrontOai = new cloudfront.OriginAccessIdentity(this, 'PicopicFrontendOAI');

    const certificate = new certificateManager.DnsValidatedCertificate(this, 'PicopicFrontendCertificate', {
      domainName,
      hostedZone,
      region: 'us-east-1', // required by CloudFront
    });

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

    new route53.ARecord(this, 'PicopicFrontendARecord', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
    });

    new patterns.HttpsRedirect(this, 'PicopicFrontendRedirect', {
      zone: hostedZone,
      recordNames: [`www.${domainName}`],
      targetDomain: domainName,
    });

    bucket.grantRead(cloudFrontOai.grantPrincipal);
  }
}
