import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class VerifiedAgentGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (user.role !== 'AGENT') {
      throw new ForbiddenException('Only agents can access this resource');
    }

    // if (!user.isVerified) {
    //   throw new ForbiddenException('Agent account is not verified');
    // }

    if (user.verificationStatus !== 'APPROVED') {
      throw new ForbiddenException('Agent account is not approved');
    }

    return true;
  }
}
