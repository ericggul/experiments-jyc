const id = "six-sigma:0923:hello-world";
const room = "experiment:six-sigma:0923:hello-world";
const events = Object.freeze({
  join: "six-sigma:0923:hello-world:join",
  hello: "six-sigma:0923:hello-world:hello",
});

export const helloWorldExperiment = {
  id,
  events,
  register({ socket }) {
    socket.on(events.join, () => {
      socket.join(room);
      socket.emit(events.hello);
    });
  },
};
