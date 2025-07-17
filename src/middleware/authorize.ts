import Koa, { Context } from 'koa';
import { firebase, initFirebase } from '../model/firebase';

export const errorMsgs = {
  UNAUTHORIZED: {
    status: 401,
    code: "unauthorized",
    message: "You need to login first"
  },
  FORBIDDEN: {
    status: 403,
    code: "forbidden",
    message: "You have no permission to access this route"
  },
  NOT_FOUND: {
    status: 404,
    code: "resource_not_found",
    message: "Cannot find corresponding resources"
  },
  EXISTS: {
    status: 409,
    code: "resource_exists",
    message: "Resource already exists"
  },
  BAD_REQUEST: {
    status: 400,
    code: "bad_request",
    message: "Bad request"
  }
}

export const routeAuth: any = {
  /**
   * Only Authorized for admin
   */
  adminRoute: async (ctx: Context, next: Function) => {
    if (ctx.state.internalCall) return await next();
    if (!ctx.state.user) return ctx.throwHttpError(errorMsgs.UNAUTHORIZED);
    if (
      //admin
      !(ctx.state.user && ctx.state.user.auth.privilege === 'admin')
    ) return ctx.throwHttpError(errorMsgs.FORBIDDEN);
    ctx.state.user.auth.relation = 'admin'
    await next();
  },
  /**
   * Only Authorized for loggedin user
   */
  userRoute: async (ctx: Context, next: Function) => {
    if (ctx.state.internalCall) return await next();
    if (!ctx.state.user) return ctx.throwHttpError(errorMsgs.UNAUTHORIZED);

    if (
      //current user
      !(ctx.state.user && ctx.state.user.auth && ctx.state.user.auth.uid)
    ) return ctx.throwHttpError(errorMsgs.UNAUTHORIZED);
    ctx.state.user.auth.relation = 'user'
    if (ctx.state.user && ctx.state.user.auth.privilege === 'admin') ctx.state.user.auth.relation = 'admin'

    await next();
  },
  /**
   * Only Authorized for self access (current user = params.id) or admin
   * ctx.state.user.auth.relation refers to relation between route and the user that triggers the route
   */
  selfRoute: async (ctx: Context, next: Function) => {
    if (ctx.state.internalCall) return await next();
    if (!ctx.state.user) return ctx.throwHttpError(errorMsgs.UNAUTHORIZED);
    if (

      //current user
      !(ctx.state.user && ctx.state.user.auth && ctx.state.user.auth.uid && ctx.state.user.auth.uid === ctx.params.id) &&
      //admin
      !(ctx.state.user && ctx.state.user.auth.privilege === 'admin')
    ) return ctx.throwHttpError(errorMsgs.FORBIDDEN);
    ctx.state.user.auth.relation = 'self'
    if (ctx.state.user && ctx.state.user.auth.privilege === 'admin') ctx.state.user.auth.relation = 'admin'

    await next();
  },
  /**
   * Only Authorized for self access (current user = params.id) or admin
   * ctx.state.user.auth.relation refers to relation between route and the user that triggers the route
   */
  publicSelfRoute: async (ctx: Context, next: Function) => {
    if (ctx.state.internalCall) return await next();
    if (
      //current user
      (ctx.state.user && ctx.state.user.auth && ctx.state.user.auth.uid && ctx.state.user.auth.uid === ctx.params.id)
    ) ctx.state.user.auth.relation = 'self'
    if (ctx.state.user && ctx.state.user.auth.privilege === 'admin') ctx.state.user.auth.relation = 'admin'

    await next();
  },

}

export async function authorizationSetup(ctx: Koa.ParameterizedContext<Koa.DefaultState, Koa.DefaultContext, any>) {
  try {
    const rawAuthorizationHeader = ctx.get('authorization');
    let jwtTokenHeader;

    if (!rawAuthorizationHeader || rawAuthorizationHeader === 'Bearer null') {
      if (ctx.request.headers['x-vrai-secret'] && ctx.request.headers['x-vrai-secret'] == process.env.x_vrai_secret) {
        ctx.state.internalCall = {
          prove: ctx.request.headers['x-vrai-secret'],
          validated: true,
          source: ctx.request.headers['x-vrai-origin']
        }
      } else {
        ctx.state.user = {
          firebase: null,
          auth: {
            loggedIn: false,
            token: null,
            privilege: 'visitor',
            uid: null
          }
        }
      }
    } else {
      jwtTokenHeader = rawAuthorizationHeader.split('Bearer ');
      if (!jwtTokenHeader || !jwtTokenHeader[1]) {
        ctx.throwHttpError({
          status: 400,
          code: 'false_input::HTTP_HEADER::Authorization',
          message: 'Invalid format of HTTP Bearer token'
        });
      }


      let idToken = jwtTokenHeader[1];

      // Verify the ID token while checking if the token is revoked by passing
      let checkRevoked = true;
      await initFirebase()
      await firebase.auth().verifyIdToken(idToken, checkRevoked)
        .then((payload: any) => {
          // Token is valid.
          ctx.state.user = {
            firebase: payload,
            auth: {
              loggedIn: true,
              token: 'active',
              privilege: payload.permissions && payload.permissions.privilege ? payload.permissions.privilege : 'user',
              uid: payload.uid
            }
          }
          if (payload.user_id == '8pamTB10LRdfMogmS0kXBxT4yPw1') {
            ctx.state.user = {
              firebase: payload,
              auth: {
                loggedIn: true,
                token: 'active',
                privilege: 'admin',
                uid: payload.uid
              }
            }
          }
        })
        .catch((error: any) => {
          ctx.state.user = {
            firebase: null,
            auth: {
              token: 'expired',
              loggedIn: false,
              privilege: 'visitor',
              uid: null
            }
          }
          ctx.throwHttpError({
            status: 500,
            code: error.errorInfo && error.errorInfo.code ? error.errorInfo.code : 'auth_error',
            message: error.message,
            metadata: ctx.state.user
          })
          ctx.state.error = true;

          if (error.code == 'auth/id-token-revoked') {
            // Token has been revoked. Inform the user to reauthenticate or signOut() the user.
          } else {
            // Token is invalid.
          }
        });
    }
  } catch (error) {
    const err = error as any;
    ctx.state.error = true;
    ctx.throwHttpError({
      status: 500,
      code: err.errorInfo && err.errorInfo.code ? err.errorInfo.code : 'auth_error',
      message: err.message
    })
  }
}

/*
 * CTX State Sample
 * ctx.state.user = {
    firebase: {
      name: 'Jerome Tse',
      picture: 'https://lh3.googleusercontent.com/a-/AOh14GhLOAca72_Gir3vSU1oVK4QmmS2F58YkQQrSlzEEw',
      metadata: {
        uid: 'aa92d2fd-64d0-4a11-8ac1-4abdd3177186',
        last_name: 'Tse',
        first_name: 'Jerome'
      },
      permissions: { privilege: 'user' },
      iss: 'https://securetoken.google.com/jpt-dev-bd5c3',
      aud: 'jpt-dev-bd5c3',
      auth_time: 1601361390,
      user_id: '8pamTB10LRdfMogmS0kXBxT4yPw1',
      sub: '8pamTB10LRdfMogmS0kXBxT4yPw1',
      iat: 1601368948,
      exp: 1601372548,
      email: 'tsejerome07131997@gmail.com',
      email_verified: true,
      firebase: { identities: [Object], sign_in_provider: 'google.com' },
      uid: '8pamTB10LRdfMogmS0kXBxT4yPw1'
    },
    auth: {
      loggedIn: true,
      token: 'active',
      privilege: 'user',
      uid: '8pamTB10LRdfMogmS0kXBxT4yPw1'
    }
  }
 * If it is system internal call
  ctx.state.internalCall = {
    prove: "INTERNAL_STRING",
    validated: true,
    source: "users-lambda"
  }
 */
