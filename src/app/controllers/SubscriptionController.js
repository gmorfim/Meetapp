import * as Yup from 'yup';
import { parseISO, isBefore } from 'date-fns';
import Meetup from '../models/Meetup';
import Subscription from '../models/Subscription';
import User from '../models/User';

class SubscriptionController {
  async store(req, res) {
    const user = await User.findByPk(req.userId);

    const meetup = await Meetup.findByPk(req.params.meetupId, {
      include: [User],
    });

    if (meetup.user_id === req.userId) {
      return res
        .status(400)
        .json({ error: "Can't subscribe for the meetup you host." });
    }

    if (meetup.past) {
      return res.status(400).json({
        error: "Can't subscribe past meetups.",
      });
    }

    const checkDate = await Subscription.findOne({
      where: {
        user_id: user.id,
      },
      include: [
        {
          model: Meetup,
          required: true,
          where: {
            date: meetup.date,
          },
        },
      ],
    });

    if (checkDate) {
      return res
        .status(400)
        .json({ error: "Can't subscribe to two meetups at the same time" });
    }

    const subscription = await Subscription.create({
      user_id: user.id,
      meetup_id: meetup.id,
    });

    // send mail (queue).

    return res.json(subscription);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string(),
      description: Yup.string(),
      location: Yup.string(),
      date: Yup.date(),
      banner_id: Yup.number(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const meetup = await Meetup.findByPk(req.params.id);

    if (meetup.user_id !== req.userId) {
      return res.status(401).json({ error: 'Not authorized.' });
    }

    if (isBefore(parseISO(req.body.date), new Date())) {
      return res.status(400).json({
        error: 'Meetup date invalid',
      });
    }

    if (meetup.past) {
      return res.status(400).json({
        error: "Can't update past meetups.",
      });
    }

    await meetup.update(req.body);

    return res.json(meetup);
  }

  async delete(req, res) {
    const meetup = await Meetup.findByPk(req.params.id);

    if (meetup.user_id !== req.userId) {
      return res.status(401).json({ error: 'Not authorized.' });
    }

    if (meetup.past) {
      return res.status(400).json({
        error: "Can't cancelate past meetups.",
      });
    }

    await meetup.destroy();

    return res.send();
  }
}

export default new SubscriptionController();
