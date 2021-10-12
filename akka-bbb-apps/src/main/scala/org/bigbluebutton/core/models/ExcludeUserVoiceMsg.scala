package org.bigbluebutton.core.models
import akka.actor.{ Actor, ActorLogging, Props }
import org.bigbluebutton.SystemConfiguration
import com.fasterxml.jackson.databind.JsonNode
import org.bigbluebutton.common2.msgs._
import org.bigbluebutton.core.bus._
import org.bigbluebutton.core2.ReceivedMessageRouter
import scala.reflect.runtime.universe._
import org.bigbluebutton.common2.bus.ReceivedJsonMessage
import org.bigbluebutton.common2.bus.IncomingJsonMessageBus

object ExcludeUserVoiceMsg { val NAME = "ExcludeUserVoiceMsg" }
case class ExcludeUserVoiceMsg(
    header: BbbCoreHeaderWithMeetingId,
    body:   ExcludeVoiceUserMsgBody
) extends BbbCoreMsg
case class ExcludeVoiceUserMsgBody(userId: String, mutedBy: String, mute: Boolean)