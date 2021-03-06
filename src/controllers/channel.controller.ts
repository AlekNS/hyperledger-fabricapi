import { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { controller, httpDelete, httpPost } from 'inversify-express-utils';
import 'reflect-metadata';

import { responseAsUnbehaviorError } from '../helpers/responses';
import { ChaincodeApplicationType, ChaincodeApplication } from '../apps/chaincode.app';
import { FabricClientService } from '../services/fabric/client.service';

/**
 * ChannelController resource
 */
@injectable()
@controller(
  '/api/channels/:channelname',
  'AuthMiddleware'
)
export class ChannelController {
  constructor(
    @inject(ChaincodeApplicationType) private chaincodeService: ChaincodeApplication
  ) {
  }

  private setChaincodeServiceContext(req: AuthenticatedRequest) {
    this.chaincodeService.setContext(new FabricClientService(req.identification), req.identification);
  }

  private async installChaincode(req: AuthenticatedRequest, res: Response, isUpgrade: boolean) {
    try {
      this.setChaincodeServiceContext(req);

      const result = await this.chaincodeService.installChaincode({
        isUpgrade,
        channelName: req.params.channelname,
        chaincodeId: req.params.chaincodeid,
        args: req.body.args,
        peers: req.body.peers,
        eventPeer: req.body.eventPeer,
        policy: req.body.policy
      });

      // @TODO: add more verbose information
      res.json({
        isInstalled: !!result
      });
    } catch (error) {
      responseAsUnbehaviorError(res, error);
    }
  }

  private async callChaincode(req: AuthenticatedRequest, res: Response, isQuery: boolean) {
    try {
      this.setChaincodeServiceContext(req);

      const result = await this.chaincodeService.callChaincode({
        channelName: req.params.channelname,
        isQuery,
        initiatorUsername: req.body.initiatorUsername,
        chaincodeId: req.params.chaincodeid,
        method: req.body.method,
        args: req.body.args,
        transientMap: req.body.transientMap,
        peers: req.body.peers,
        eventPeer: req.body.eventPeer,
        commitTransaction: req.body.commitTransaction
      });

      // @TODO: add more verbose information
      if (isQuery) {
        res.json(result);
      } else {
        res.json({
          isInvoked: !!result
        });
      }
    } catch (error) {
      responseAsUnbehaviorError(res, error);
    }
  }

  @httpPost(
    '/chaincodes/:chaincodeid/actions/initiate',
    'ChannelInstallChaincodeRequestValidator'
  )
  async initiateChaincode(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    await this.installChaincode(req, res, false);
  }

  @httpPost(
    '/chaincodes/:chaincodeid/actions/upgrade',
    'ChannelInstallChaincodeRequestValidator'
  )
  async upgradeChaincode(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    await this.installChaincode(req, res, true);
  }

  @httpPost(
    '/chaincodes/:chaincodeid/actions/invoke',
    'ChannelCallChaincodeRequestValidator'
  )
  async invokeChaincode(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    await this.callChaincode(req, res, false);
  }

  @httpPost(
    '/chaincodes/:chaincodeid/actions/query',
    'ChannelCallChaincodeRequestValidator'
  )
  async queryChaincode(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    await this.callChaincode(req, res, true);
  }

}
