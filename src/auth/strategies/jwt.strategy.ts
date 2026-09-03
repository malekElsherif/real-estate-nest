import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ReadonlyVisitor } from '@nestjs/swagger/plugin';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from 'src/users/entities/user.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'my-secret-key',
    });
  }

  async validate(payload: any) {
    const { sub, email, role } = payload;
    const user = await this.usersRepository.findOne({
      where: {
        id: sub,
      },
    });
    if (!user) {
      throw new Error('User not found');
    }
    if (user.isActive === false) {
      throw new UnauthorizedException('User is inactive');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      verified: user.isVerified,
      name: user.name,
      verificationStatus: user.verificationStatus,
    };
  }
}
